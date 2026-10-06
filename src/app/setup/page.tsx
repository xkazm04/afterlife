import { loadSetupData } from '../features/setup/data/loadSetupData';
import { SetupScreen } from '../features/setup/SetupScreen';

export default function SetupPage() {
  return <SetupScreen {...loadSetupData()} />;
}
