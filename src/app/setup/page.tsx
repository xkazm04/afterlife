import { loadSetupData } from '../features/setup/data/loadSetupData';
import { SetupScreen } from '../features/setup/SetupScreen';

/** Live mode reads the tracks' arm blocks, the belay doctor and the steps from GitLab here, on the server, per load. */
export default async function SetupPage() {
  return <SetupScreen {...await loadSetupData()} />;
}
