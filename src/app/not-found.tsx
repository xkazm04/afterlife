import { NotFoundView } from '@/components/shell/fallback/NotFoundView';

export default function NotFound() {
  return (
    <div className="fallback-scroll">
      <title>Not found | Afterlife</title>
      <NotFoundView />
    </div>
  );
}
