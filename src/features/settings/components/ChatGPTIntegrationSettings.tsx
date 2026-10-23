import React, { useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Key,
  FileCode,
  ShieldCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { CreateKeyModal } from "@/features/agents/components/CreateKeyModal";
import { isAtLeastAdmin, useWorkspace } from "@/features/workspaces";
import { SYNC_CHATGPT_ACTION_SCHEMA, SYNC_CHATGPT_INSTRUCTION_TEXT, validateSyncActionSchema } from "@/features/sync/schema";

interface ChatGPTIntegrationSettingsProps {
  schemaCopied: boolean;
  instructionsCopied: boolean;
  onCopySchema: () => void;
  onCopyInstructions: () => void;
  onNavigateToProfile?: () => void;
}

export const ChatGPTIntegrationSettings: React.FC<ChatGPTIntegrationSettingsProps> = ({
  schemaCopied,
  instructionsCopied,
  onCopySchema,
  onCopyInstructions,
}) => {
  const [showFullInstructions, setShowFullInstructions] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const { activeWorkspace } = useWorkspace();
  const [showFullSchema, setShowFullSchema] = useState(true);

  const schemaValidationErrors = validateSyncActionSchema(SYNC_CHATGPT_ACTION_SCHEMA);
  const isSchemaValid = schemaValidationErrors.length === 0;

  const handleDownloadSchema = () => {
    const blob = new Blob([SYNC_CHATGPT_ACTION_SCHEMA], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pristine-chatgpt-openapi-schema.yaml";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const steps = [
    {
      n: 1,
      meta: <span className="text-xs text-slate-500">Step 1 of 3</span>,
      title: "Create a ChatGPT key",
      text: (
        <>
          Create an agent key for ChatGPT with only the access it needs. It is shown once; every call is governed and logged under{" "}
          <strong className="font-medium text-slate-800">Agent Governance</strong>.
        </>
      ),
      chip: (
        <>
          Header: <code className="font-medium text-slate-900">x-sync-api-key</code>
        </>
      ),
    },
    {
      n: 2,
      meta: (
        <a
          href="https://chatgpt.com/gpts/editor"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Open Builder <ExternalLink className="h-3 w-3" />
        </a>
      ),
      title: "Create Custom GPT",
      text: (
        <>
          Go to ChatGPT Builder, create a new GPT, and switch to the <strong className="font-medium text-slate-800">Configure</strong> tab.
        </>
      ),
      chip: (
        <>
          Tab: <code className="font-medium text-slate-900">Configure</code>
        </>
      ),
    },
    {
      n: 3,
      meta: <span className="text-xs text-slate-500">Step 3 of 3</span>,
      title: "Set Auth & Actions",
      text: (
        <>
          Under <strong className="font-medium text-slate-800">Actions</strong>, set Auth to{" "}
          <strong className="font-medium text-slate-800">API Key (Custom)</strong> and paste the OpenAPI Schema.
        </>
      ),
      chip: (
        <>
          Auth: <code className="font-medium text-slate-900">API Key (Custom)</code>
        </>
      ),
    },
  ];

  const operations = [
    { name: "Projects", ops: "5 Ops", text: "List, Create, Get, Update, Delete" },
    { name: "Epics", ops: "5 Ops", text: "Manage project epics & milestones" },
    { name: "Tasks", ops: "6 Ops", text: "CRUD tasks & bulk task sync" },
    { name: "Notes & Summary", ops: "6 Ops", text: "Polymorphic notes & daily summary" },
  ];

  return (
    <div className="space-y-4 font-sans">
      {/* Overview */}
      <Card>
        <div className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">ChatGPT Custom GPT Integration</Badge>
              <Badge tone="success">
                <ShieldCheck className="h-3 w-3" /> OpenAPI 3.1.0 Ready
              </Badge>
            </div>
            <h3 className="m-0 text-[15px] font-semibold text-slate-900">Connect Sync Todo to Your Custom ChatGPT Agent</h3>
            <p className="m-0 text-[13px] leading-relaxed text-slate-500">
              Enable your Custom GPT inside ChatGPT Builder to manage projects, epics, daily tasks, and notes directly through natural language conversations.
            </p>
          </div>

          <Button size="sm" variant="primary" icon={Key} onClick={() => setCreatingKey(true)} className="self-start md:self-auto">
            Create ChatGPT key
          </Button>
        </div>
      </Card>

      {/* Step-by-Step Setup Guide */}
      <Card>
        <CardHeader title="Setup & Configuration Guide" description="Follow these steps to connect ChatGPT Builder with Pristine Sync API." />
        <ol className="m-0 grid list-none grid-cols-1 gap-3 p-4 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
                    {step.n}
                  </span>
                  {step.meta}
                </div>
                <h4 className="m-0 text-sm font-medium text-slate-900">{step.title}</h4>
                <p className="m-0 text-[13px] leading-snug text-slate-600">{step.text}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-700">{step.chip}</div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Custom GPT Instructions */}
      <Card>
        <CardHeader
          title="1. Custom GPT Instructions"
          description="Copy and paste these instructions into your Custom GPT's Instructions field."
        />
        <div className="space-y-3 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-[13px] text-slate-700">System Instructions for Pristine Sync API workflow & CRUD rules.</span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setShowFullInstructions(!showFullInstructions)}>
                {showFullInstructions ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> View Instructions
                  </>
                )}
              </Button>
              <Button size="sm" variant="primary" onClick={onCopyInstructions}>
                {instructionsCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Instructions
                  </>
                )}
              </Button>
            </div>
          </div>

          {showFullInstructions && (
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2">
                <span className="text-xs font-medium text-slate-400">instructions.md</span>
                <span className="text-[11px] text-slate-400">Markdown</span>
              </div>
              <pre className="m-0 max-h-72 overflow-auto whitespace-pre-wrap break-words p-3.5 font-mono text-xs leading-relaxed text-slate-100">
                {SYNC_CHATGPT_INSTRUCTION_TEXT}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* OpenAPI Action Schema */}
      <Card>
        <CardHeader
          title="2. ChatGPT OpenAPI Action Schema"
          description="Copy and paste this schema into the Actions section of ChatGPT Builder."
        />
        <div className="space-y-3 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <FileCode className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 space-y-0.5">
                <span className="block text-[13px] font-medium text-slate-900">OpenAPI 3.1.0 Specification</span>
                {isSchemaValid ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Valid Schema (6 Endpoints)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertCircle className="h-3 w-3" /> Schema Validation Warning
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleDownloadSchema} title="Download OpenAPI Schema file">
                <Download className="h-3.5 w-3.5" /> Download .yaml
              </Button>
              <Button size="sm" onClick={() => setShowFullSchema(!showFullSchema)}>
                {showFullSchema ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> View Schema
                  </>
                )}
              </Button>
              <Button size="sm" variant="primary" onClick={onCopySchema}>
                {schemaCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Schema
                  </>
                )}
              </Button>
            </div>
          </div>

          {showFullSchema && (
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2">
                <span className="text-xs font-medium text-slate-400">openapi.yaml</span>
                <span className="text-[11px] text-emerald-400">OpenAPI 3.1.0 YAML</span>
              </div>
              <pre className="m-0 max-h-96 overflow-auto p-3.5 font-mono text-xs leading-relaxed text-slate-100">
                {SYNC_CHATGPT_ACTION_SCHEMA}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Available Endpoints Summary */}
      <Card>
        <CardHeader title="Supported API Operations" description="Available endpoints in the OpenAPI schema." />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
          {operations.map((op) => (
            <div key={op.name} className="space-y-1 rounded-lg border border-slate-200 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{op.name}</span>
                <Badge tone="neutral">{op.ops}</Badge>
              </div>
              <p className="m-0 text-[13px] text-slate-500">{op.text}</p>
            </div>
          ))}
        </div>
      </Card>
      {creatingKey ? (
        <CreateKeyModal
          canAdmin={activeWorkspace ? isAtLeastAdmin(activeWorkspace.role) : false}
          defaultName="ChatGPT custom GPT"
          onClose={() => setCreatingKey(false)}
          onCreated={() => undefined}
          workspaceId={activeWorkspace?.id ?? null}
        />
      ) : null}
    </div>
  );
};
