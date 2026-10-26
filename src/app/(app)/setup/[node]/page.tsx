import { ParamShell, paramTitle } from '@/app/features/screens/paramPage';

// The route exists for a hard load and its title; it reads nothing. The screen host draws the node's page
// (features/setup/screen/host.tsx); an unknown node is the stream's notFound (SetupNodeNotFound). Its data streams over
// GET /api/screen/setup%2F%5Bnode%5D. The title names the param: features/screens/paramPage.tsx is the one pattern
// every [param] page uses (an empty request-time marker, so the title is request data on purpose).
export const generateMetadata = paramTitle('Belay Setup', 'node');

export default function SetupNodePage() {
  return <ParamShell />;
}
