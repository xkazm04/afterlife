import { ParamShell, paramTitle } from '@/app/features/screens/paramPage';

// The route exists for a hard load and its title; it reads nothing. The screen host draws the class page
// (features/ladder/screen/host.tsx); an unknown class is the stream's notFound (ClassNotFound). Its data streams over
// GET /api/screen/ladder%2F%5Bclass%5D. The title names the param: features/screens/paramPage.tsx is the one pattern
// every [param] page uses (an empty request-time marker, so the title is request data on purpose).
export const generateMetadata = paramTitle('Belay Ladder', 'class');

export default function LadderClassPage() {
  return <ParamShell />;
}
