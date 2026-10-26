// The legacy arm-B host (the Fleet and Needs-you lists from /api/screen/legacy JSON, until W1/W2 convert them to the
// screen host). The (app) layout mounts it inside ScreenHost; the screen host's click delegation hands it the list
// links it does not claim itself (ArmHostB registers with setLegacy). The Director deletes nav/b in W5.
export { ArmHostB as LegacyHost } from './ArmHostB';
