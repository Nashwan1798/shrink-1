import { H1 } from "@/app/components/ui/bits";
import { requireUser } from "@/lib/server/auth/current";
import { fetchProjects } from "@/lib/server/hackatime";
import { projectsInUse, shipById } from "@/lib/server/ships";

import ShipForm from "./ShipForm";

export default async function ShipPage({ searchParams }: { searchParams: Promise<{ from?: string; project?: string }> }) {
  const user = await requireUser("/app/ship");
  const { from, project } = await searchParams;

  const [projects, used, previous] = await Promise.all([
    fetchProjects(user.id, { includeOlder: true }).catch(() => null),
    projectsInUse(user.id),
    from ? shipById(from) : Promise.resolve(null),
  ]);
  const reship = previous && previous.userId === user.id && previous.state === "rejected" ? previous : null;

  return (
    <>
      <H1>{reship ? "ship it again" : "ship a project"}</H1>
      <ShipForm
        hackatime={projects === null ? null : projects.map((p) => ({ ...p, used: used.has(p.name) }))}
        preselect={project && !used.has(project) ? project : null}
        initial={
          reship
            ? {
                id: reship.id,
                title: reship.title,
                description: reship.description,
                dataUri: reship.dataUri,
                sourceUrl: reship.sourceUrl ?? "",
                hackatimeProjects: reship.hackatimeProjects,
                claimedBadges: reship.claimedBadges,
                reviewerNote: reship.publicMessage,
              }
            : null
        }
      />
    </>
  );
}
