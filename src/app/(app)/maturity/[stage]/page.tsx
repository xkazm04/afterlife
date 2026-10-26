import { ParamShell, paramTitle } from '@/app/features/screens/paramPage';

// The route exists for a hard load and its title; it reads nothing. The screen host draws the stage page
// (features/maturity/screen/host.tsx); an unknown stage is the stream's notFound (StageNotFound). Its data streams over
// GET /api/screen/maturity%2F%5Bstage%5D. The title names the param: features/screens/paramPage.tsx is the one pattern
// every [param] page uses (an empty request-time marker, so the title is request data on purpose).
export const generateMetadata = paramTitle('Afterlife · Maturity', 'stage');

export default function MaturityStagePage() {
  return <ParamShell />;
}
