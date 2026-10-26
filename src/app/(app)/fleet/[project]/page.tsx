import { ParamShell, paramTitle } from '@/app/features/screens/paramPage';

// The route exists for a hard load and its title; it reads nothing. The screen host draws the project's page
// (features/fleet/screen/host.tsx); an id the fleet does not have is the stream's notFound. Its data streams over GET
// /api/screen/fleet%2F%5Bproject%5D. The title names the param: features/screens/paramPage.tsx is the one pattern every
// [param] page uses (an empty request-time marker, so the title is request data on purpose).
export const generateMetadata = paramTitle('Belay Fleet', 'project');

export default function FleetProjectPage() {
  return <ParamShell />;
}
