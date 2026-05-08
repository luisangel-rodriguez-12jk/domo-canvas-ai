import { getPreflightIssues, getPrintReadinessLabel } from '../core/preflight';
import type { CanvasProject } from '../core/types';

interface Props {
  project: CanvasProject;
}

export function PreflightPanel({ project }: Props) {
  const issues = getPreflightIssues(project);
  const label = getPrintReadinessLabel(project);
  return (
    <section className="panel preflight-panel">
      <div className="panel-title">Preflight impresión</div>
      <div className={`readiness ${issues.some((issue) => issue.severity === 'error') ? 'bad' : issues.some((issue) => issue.severity === 'warning') ? 'warn' : 'ok'}`}>
        {label}
      </div>
      <ul>
        {issues.map((issue) => (
          <li key={`${issue.code}-${issue.title}`} className={issue.severity}>
            <b>{issue.title}</b>
            <span>{issue.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
