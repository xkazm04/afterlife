// What a job's script or tasks show beyond its name, per stage: a scanner run as a command, a deploy task, an IaC
// deployment. Conservative: a tool counts only where it runs (at the start of a command, after a separator, a path or a
// runner such as npx), never in a shell comment, an install line or a display name (which is not script).
import type { CiJob } from '../facts';

/** The job's script with shell comments removed: a `#` at the start of a word ends the line's command. */
const commands = (script: string): string => script.replace(/(^|\s)#.*$/gm, '$1');

const AT_COMMAND = String.raw`(?:^|[;&|(\x60]|\$\()\s*(?:(?:sudo|npx|uvx|pipx run|python3?\s+-m)\s+(?:--yes\s+|-y\s+)?)?(?:\S*\/)?`;
const run = (tools: string): RegExp => new RegExp(`${AT_COMMAND}(?:${tools})`, 'im');

const SCANNER = run(
  [
    String.raw`bandit\s+-`,
    String.raw`gitleaks\s+(?:detect|protect|git|dir)\b`,
    String.raw`pip-audit\b`,
    String.raw`npm\s+audit\b`,
    String.raw`trivy\s+(?:image|fs|filesystem|repo|repository|config|sbom|rootfs)\b`,
    String.raw`semgrep\s+(?:scan|ci|--config)\b`,
    String.raw`codeql\s+database\b`,
    String.raw`cyclonedx-(?:py|npm)\b`,
    String.raw`syft\s`,
  ].join('|'),
);
const SCANNER_TASK = /^(AdvancedSecurity-|github\/codeql-action\/|aquasecurity\/trivy-action|gitleaks\/gitleaks-action|returntocorp\/semgrep-action|semgrep\/semgrep-action|pypa\/gh-action-pip-audit|anchore\/(sbom|scan)-action)/i;

const DEPLOY_TASK = new RegExp(
  [
    String.raw`^(AzureWebApp|AzureRmWebAppDeployment|AzureFunctionApp|AzureWebAppContainer|AzureContainerApps)@`,
    String.raw`^AzureAppServiceManage@\d+ \((Swap Slots|Start Swap With Preview|Complete Swap)\)`,
    String.raw`^azure\/(webapps|functions)-deploy@`,
    String.raw`^softprops\/action-gh-release@`,
  ].join('|'),
  'i',
);
const DEPLOY = run(String.raw`az\s+(?:webapp|functionapp)\s+(?:deploy\b|deployment\s+(?:slot\s+swap|source\s+config-zip)\b)`);
const PACKAGE_TASK = /^(ArchiveFiles|Docker)@|^docker\/build-push-action@/i;
const IAC_TASK = /^(AzureResourceManagerTemplateDeployment|TerraformTask\w*|TerraformCLI)@|^azure\/arm-deploy@/i;
const IAC = run(String.raw`az\s+deployment\s+(?:group|sub|mg|tenant)\s+(?:create|what-if)\b|az\s+bicep\s+build\b|bicep\s+build\b`);

const tasks = (j: CiJob, re: RegExp): boolean => (j.tasks ?? []).some((t) => re.test(t));

/** A security scanner or SBOM generator run by the job. */
export const runsScanner = (j: CiJob): boolean => SCANNER.test(commands(j.script)) || tasks(j, SCANNER_TASK);

/** A deploy of the built app (a web or function app deploy task or az command, a slot swap) or a GitHub release. An
 * environment alone is not one: an Azure deployment job or a GitHub environment also gates data jobs behind an approval. */
export const deploys = (j: CiJob): boolean => DEPLOY.test(commands(j.script)) || tasks(j, DEPLOY_TASK);

/** A build that packages its output: an archive, an image, a package push. */
export const packages = (j: CiJob): boolean => tasks(j, PACKAGE_TASK);

/** An infrastructure-as-code deployment or preview (ARM/Bicep, Terraform tasks). */
export const appliesIac = (j: CiJob): boolean => IAC.test(commands(j.script)) || tasks(j, IAC_TASK);

/** The names a job goes by: its id, then its display name and its id as words. */
export const namesOf = (j: CiJob): string[] => [j.name, ...(j.aliases ?? [])];
