import React from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  Info,
  Plus,
  Key,
  Trash2,
  RefreshCcw,
  Clock,
} from "lucide-react";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import type { CompanionDevice } from "../hooks/useSettings";

interface CompanionDevicesListProps {
  devices: CompanionDevice[];
  isLoading: boolean;
  onOpenCreateModal: () => void;
  onOpenPairModal: () => void;
  onRegenerateKey: (device: CompanionDevice) => void;
  onRevokeDevice: (deviceId: string) => void;
}

const deviceIconMap: Record<string, React.FC<{ className?: string }>> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  assistant: Info,
};

export const CompanionDevicesList: React.FC<CompanionDevicesListProps> = ({
  devices,
  isLoading,
  onOpenCreateModal,
  onOpenPairModal,
  onRegenerateKey,
  onRevokeDevice,
}) => {
  return (
    <Card className="font-sans">
      <CardHeader
        title="Companion Mobile & Desktop Devices"
        description="Manage paired secondary devices, generate pairing keys, or authorize device sessions."
        actions={
          <>
            <Button size="sm" icon={Key} onClick={onOpenPairModal}>
              Pair Device
            </Button>
            <Button size="sm" variant="primary" icon={Plus} onClick={onOpenCreateModal}>
              Add Companion Device
            </Button>
          </>
        }
      />
      <div className="space-y-4 p-4 sm:p-5">
        {/* Device Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-600">
          <span>
            Active Registered Devices: <span className="font-semibold text-slate-900">{devices.length}</span>
          </span>
          <span className="text-xs text-slate-500">Max limit: 5 devices</span>
        </div>

        {/* Device Listing */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
            <p className="sr-only">Syncing companion devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            compact
            icon={Smartphone}
            title="No companion devices currently registered."
            description="Click Add Companion Device above to configure device credentials."
          />
        ) : (
          <ul className="m-0 list-none divide-y divide-slate-100 rounded-lg border border-slate-200 p-0">
            {devices.map((device) => {
              const Icon = deviceIconMap[device.deviceType] || Smartphone;
              const isPending = device.status === "pending";
              const isRevoked = device.status === "revoked";

              return (
                <li
                  key={device.id}
                  className="flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="m-0 truncate text-sm font-medium text-slate-900">{device.deviceName}</h4>
                        <Badge tone={isPending ? "warning" : isRevoked ? "danger" : "success"} dot>
                          {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="capitalize">{device.deviceType}</span>
                        <span aria-hidden>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created: {device.createdAt ? new Date(device.createdAt).toLocaleDateString() : "Recently"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isPending && (
                      <Button size="sm" icon={RefreshCcw} onClick={() => onRegenerateKey(device)} title="Regenerate Pairing Key">
                        Key
                      </Button>
                    )}
                    {!isRevoked && (
                      <Button size="sm" variant="danger" icon={Trash2} onClick={() => onRevokeDevice(device.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};
