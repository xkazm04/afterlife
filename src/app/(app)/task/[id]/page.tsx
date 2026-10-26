import { ParamShell, paramTitle } from '@/app/features/screens/paramPage';

// The route exists for a hard load and its title; it reads nothing. The screen host draws the task
// (features/task/screen/host.tsx); an id the docket does not hold is the stream's notFound. Its data streams over GET
// /api/screen/task%2F%5Bid%5D. The title names the param: features/screens/paramPage.tsx is the one pattern every
// [param] page uses (an empty request-time marker, so the title is request data on purpose).
export const generateMetadata = paramTitle('Belay Task', 'id');

export default function TaskPage() {
  return <ParamShell />;
}
