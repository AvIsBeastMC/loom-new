import { LoaderCircle, TriangleAlert } from "lucide-react";

type LoadStateProps = {
  loading?: boolean;
  error?: string;
  empty?: string;
};

export function LoadState({ loading, error, empty }: LoadStateProps) {
  if (loading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center gap-2.5 rounded-lg border border-[#2b332d] bg-[#181d19] p-6 text-center text-[#929b91]" role="status">
        <LoaderCircle className="animate-spin" size={20} />
        <span>Loading dashboard data</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[120px] items-center justify-center gap-2.5 rounded-lg border border-[#2b332d] bg-[#181d19] p-6 text-center text-[#e78f83]" role="alert">
        <TriangleAlert size={22} />
        <p>{error}</p>
      </div>
    );
  }

  return empty ? <div className="flex min-h-[120px] items-center justify-center gap-2.5 rounded-lg border border-[#2b332d] bg-[#181d19] p-6 text-center text-[#929b91]">{empty}</div> : null;
}