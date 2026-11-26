import { CentreMemberDirectory } from "../components/CentreMemberDirectory";
import { useSession } from "../context/SessionContext";
import { useRecords } from "../hooks/useRecords";

export function CentreMembersPage() {
  const { session } = useSession();
  const { records: centres } = useRecords("centres");
  const { records: groups } = useRecords("groups");
  const { records: members } = useRecords("members");
  const centre = centres.find((item) => item.id === session.centreId);

  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Centre administration</span>
          <h1>{centre?.name || "Centre"} members</h1>
          <p>Browse member records across the groups in this centre.</p>
        </div>
      </div>
      <CentreMemberDirectory groups={groups} members={members} />
    </div>
  );
}
