// POST /api/start/save: the wizard's Save click, the same as POST /api/onboard/save (same body, same answer, loopback
// only): /start reaches it under its own name.
import { POST as save } from '../../onboard/save/route';

export async function POST(req: Request): Promise<Response> {
  return save(req);
}
