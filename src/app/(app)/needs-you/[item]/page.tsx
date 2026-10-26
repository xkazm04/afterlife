import { ParamShell, paramTitle } from '@/app/features/screens/paramPage';

// The route exists for a hard load and its title; it reads nothing. The screen host draws the decision's page
// (features/needs-you/screen/host.tsx); an unknown id is the stream's notFound (DecisionNotFound). Its data streams
// over GET /api/screen/needs-you%2F%5Bitem%5D. The title names the param: features/screens/paramPage.tsx is the one
// pattern every [param] page uses (an empty request-time marker, so the title is request data on purpose).
export const generateMetadata = paramTitle('Belay Needs you', 'item');

export default function NeedsItemRoute() {
  return <ParamShell />;
}
