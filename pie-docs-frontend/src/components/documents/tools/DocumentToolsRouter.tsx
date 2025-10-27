/**
 * DocumentToolsRouter - Routes to the appropriate tool component
 */

import React from 'react';
import { ACLsTool } from './ACLsTool';
import { CabinetsTool } from './CabinetsTool';
import { MetadataTool } from './MetadataTool';
import { TagsTool } from './TagsTool';
import { VersionsTool } from './VersionsTool';
import { CommentsTool } from './CommentsTool';
import { WorkflowsTool } from './WorkflowsTool';
import { CheckInOutTool } from './CheckInOutTool';
import { DuplicatesTool } from './DuplicatesTool';
import { EventsTool } from './EventsTool';
import { FilesTool } from './FilesTool';
import { IndexesTool } from './IndexesTool';
import { PropertiesTool } from './PropertiesTool';
import { SandboxTool } from './SandboxTool';
import { SignaturesTool } from './SignaturesTool';
import { SmartLinksTool } from './SmartLinksTool';
import { SubscriptionsTool } from './SubscriptionsTool';
import { WebLinksTool } from './WebLinksTool';
import { PlaceholderTool } from './PlaceholderTool';
import type { DocumentToolProps } from './types';

export interface DocumentToolsRouterProps extends DocumentToolProps {
  /** The selected tool ID */
  toolId: string;
  /** All available tools */
  allTools: Array<{ id: string; label: string; icon: string }>;
  /** Callback when tool is closed */
  onClose: () => void;
}

export const DocumentToolsRouter: React.FC<DocumentToolsRouterProps> = ({
  toolId,
  document,
  allTools,
  onClose,
  className = '',
}) => {
  const selectedTool = allTools.find(t => t.id === toolId);

  // Route to the appropriate tool component
  const renderTool = () => {
    switch (toolId) {
      case 'acls':
        return <ACLsTool document={document} onBack={onClose} className={className} />;

      case 'cabinets':
        return <CabinetsTool document={document} onBack={onClose} className={className} />;

      case 'checkinout':
        return <CheckInOutTool document={document} onBack={onClose} className={className} />;

      case 'comments':
        return <CommentsTool document={document} onBack={onClose} className={className} />;

      case 'duplicates':
        return <DuplicatesTool document={document} onBack={onClose} className={className} />;

      case 'events':
        return <EventsTool document={document} onBack={onClose} className={className} />;

      case 'files':
        return <FilesTool document={document} onBack={onClose} className={className} />;

      case 'indexes':
        return <IndexesTool document={document} onBack={onClose} className={className} />;

      case 'metadata':
        return <MetadataTool document={document} onBack={onClose} className={className} />;

      case 'properties':
        return <PropertiesTool document={document} onBack={onClose} className={className} />;

      case 'sandbox':
        return <SandboxTool document={document} onBack={onClose} className={className} />;

      case 'signatures':
        return <SignaturesTool document={document} onBack={onClose} className={className} />;

      case 'smartlinks':
        return <SmartLinksTool document={document} onBack={onClose} className={className} />;

      case 'subscriptions':
        return <SubscriptionsTool document={document} onBack={onClose} className={className} />;

      case 'tags':
        return <TagsTool document={document} onBack={onClose} className={className} />;

      case 'versions':
        return <VersionsTool document={document} onBack={onClose} className={className} />;

      case 'weblinks':
        return <WebLinksTool document={document} onBack={onClose} className={className} />;

      case 'workflows':
        return <WorkflowsTool document={document} onBack={onClose} className={className} />;

      default:
        // Placeholder for tools not yet implemented
        return (
          <PlaceholderTool
            document={document}
            toolId={toolId}
            toolLabel={selectedTool?.label || 'Unknown Tool'}
            toolIcon={selectedTool?.icon}
            onBack={onClose}
            className={className}
          />
        );
    }
  };

  return <div className="flex-1 overflow-auto p-6">{renderTool()}</div>;
};

export default DocumentToolsRouter;
