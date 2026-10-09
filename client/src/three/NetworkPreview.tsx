// PLACEHOLDER — replaced during implementation (owner: 3D agent).
// Contract: lightweight, lazily-loadable network scene for the landing page, fed by public preview data.
import type { NetworkPreviewNode } from '@/types/api';

export interface NetworkPreviewProps {
  nodes: NetworkPreviewNode[];
  /** CSS height of the canvas container (default '100%'). */
  height?: string;
  /** Allow orbit/hover/selection (default true). Disable for purely decorative use. */
  interactive?: boolean;
  /** Called when a node is clicked. */
  onSelect?: (node: NetworkPreviewNode) => void;
  className?: string;
}

export default function NetworkPreview({ nodes, height = '100%', className }: NetworkPreviewProps) {
  return (
    <div className={className} style={{ height }} aria-label="Network preview">
      {nodes.length} transformers
    </div>
  );
}
