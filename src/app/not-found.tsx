import { NotFoundView } from '@/components/shell/fallback/NotFoundView';

export default function NotFound() {
  return (
    <div className="fallback-scroll">
      <title>Belay Not found</title>
      <NotFoundView />
    </div>
  );
}
