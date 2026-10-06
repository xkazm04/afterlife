import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import { SetupScreen } from '../features/setup/SetupScreen';

export default function SetupPage() {
  return <SetupScreen setup={getSetup()} tracks={getTracks()} classes={getActionClasses()} />;
}
