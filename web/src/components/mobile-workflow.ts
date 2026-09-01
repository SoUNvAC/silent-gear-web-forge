import { state, subscribe, update } from '../state.js';
import type { MobileStep } from '../state.js';
import { el, clear } from './shared.js';

const STEPS: { id: MobileStep; label: string; short: string }[] = [
  { id: 'assembly', label: '第 1 步：装配槽位', short: '装配' },
  { id: 'materials', label: '第 2 步：选择材料', short: '选材' },
  { id: 'result', label: '第 3 步：查看结果', short: '结果' },
];

export function mountMobileWorkflow(mount: HTMLElement, workspace: HTMLElement): void {
  const render = (): void => {
    workspace.dataset.mobileStep = state.mobileStep;
    clear(mount);
    for (const step of STEPS) {
      const button = el('button', `mobile-step${state.mobileStep === step.id ? ' active' : ''}`, step.short);
      button.type = 'button';
      button.setAttribute('aria-label', step.label);
      button.addEventListener('click', () => update({ mobileStep: step.id }));
      mount.append(button);
    }
  };
  subscribe(render);
  render();
}
