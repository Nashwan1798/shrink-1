import "server-only";

import { eq } from "drizzle-orm";

import { hm } from "@/lib/program";

import { decryptJson } from "./crypto";
import { db } from "./db/client";
import { orders, ships, users, type Order, type Ship, type User } from "./db/schema";
import { env } from "./env";
import type { Address } from "./auth/hca";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function slack(method: string, body: Record<string, unknown>): Promise<void> {
  if (!env.SLACK_BOT_TOKEN) return;
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) console.error(`[slack] ${method} failed: ${json.error ?? res.status}`);
  } catch (e) {
    console.error(`[slack] ${method} threw`, e);
  }
}

async function channel(text: string) {
  if (!env.SLACK_CHANNEL_ID) return;
  await slack("chat.postMessage", { channel: env.SLACK_CHANNEL_ID, text, unfurl_links: false, unfurl_media: false });
}

async function dm(user: Pick<User, "slackId">, text: string) {
  if (!user.slackId) return;
  await slack("chat.postMessage", { channel: user.slackId, text, unfurl_links: false, unfurl_media: false });
}

const who = (u: Pick<User, "displayName" | "slackId">) => (u.slackId ? `<@${u.slackId}>` : esc(u.displayName));

export async function shipShipped(ship: Ship, author: User, origin: string) {
  await channel(
    `${who(author)} shipped *${esc(ship.title)}* (${ship.bytes}b, ${hm(ship.claimedSeconds)} logged). <${origin}/review?s=${ship.id}|review it>`,
  );
}

export async function shipDecided(ship: Ship, author: User, origin: string) {
  const link = `<${origin}/app/ships/${ship.id}|${esc(ship.title)}>`;
  if (ship.state === "approved") {
    await Promise.all([
      channel(`${who(author)}'s ${link} was approved: ${ship.awardedBites} BITES.`),
      dm(
        author,
        `your ship *${esc(ship.title)}* was approved for *${ship.awardedBites} BITES*! 🎉\n${
          ship.publicMessage ? `> ${esc(ship.publicMessage)}\n` : ""
        }spend them at ${origin}/app/shop`,
      ),
    ]);
  } else if (ship.state === "rejected") {
    await Promise.all([
      channel(`${who(author)}'s ${link} was sent back.`),
      dm(
        author,
        `your ship *${esc(ship.title)}* was sent back.\n${
          ship.publicMessage ? `> ${esc(ship.publicMessage)}\n` : ""
        }fix it up and ship again at ${origin}/app/ships/${ship.id}`,
      ),
    ]);
  }
}

export async function orderPlaced(order: Order, user: User, origin: string) {
  await channel(`${who(user)} ordered *${esc(order.rewardName)}* for ${order.cost} BITES. <${origin}/admin/orders|orders>`);
}

export async function orderHandled(order: Order, user: User) {
  const text =
    order.state === "fulfilled"
      ? `your *${esc(order.rewardName)}* is on its way!`
      : `your order for *${esc(order.rewardName)}* was cancelled and your ${order.cost} BITES are back.${
          order.internalNote ? `\n> ${esc(order.internalNote)}` : ""
        }`;
  await dm(user, text);
}


export async function loadShipAndAuthor(shipId: string) {
  const [row] = await db
    .select({ ship: ships, author: users })
    .from(ships)
    .innerJoin(users, eq(ships.userId, users.id))
    .where(eq(ships.id, shipId))
    .limit(1);
  return row ?? null;
}

export async function loadOrderAndUser(orderId: string) {
  const [row] = await db
    .select({ order: orders, user: users })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  return row ?? null;
}

export const orderBinding = (order: Pick<Order, "id" | "userId">) => `orders/${order.userId}/${order.id}/shipping`;

export function readAddress(order: Order): Address | null {
  if (!order.shippingEncrypted) return null;
  return decryptJson<Address>(order.shippingEncrypted, orderBinding(order));
}
