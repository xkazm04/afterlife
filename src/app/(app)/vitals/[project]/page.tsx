import { ParamShell, paramTitle } from '@/app/features/screens/paramPage';

// The route exists for a hard load and its title; it reads nothing. The screen host draws the project's vitals
// (features/vitals/screen/host.tsx), band by band; an unknown slug is the stream's notFound. Its data streams over GET
// /api/screen/vitals%2F%5Bproject%5D. The title names the param: features/screens/paramPage.tsx is the one pattern
// every [param] page uses (an empty request-time marker, so the title is request data on purpose).
export const generateMetadata = paramTitle('Afterlife · Vitals', 'project');

export default function VitalsProjectPage() {
  return <ParamShell />;
}
