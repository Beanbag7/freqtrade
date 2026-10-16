import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useBacktestHistory,
  useDeleteBacktestFile,
  useUpdateBacktestNotes,
} from "@/lib/api/hooks";
import type { BacktestHistoryEntry } from "@/lib/api/types";
import { cn, formatTimestamp } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorAlert } from "@/components/shared/states";

interface BacktestHistoryListProps {
  selectedFile: string | null;
  onSelect: (file: string | null) => void;
}

function HistoryRow({
  entry,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  entry: BacktestHistoryEntry;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-md border transition-colors",
        active ? "border-primary/25 bg-accent" : "hover:bg-accent/40",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="w-full rounded-md px-3 py-2 pr-24 text-left focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className={cn("block truncate text-control font-medium", active && "text-primary")}>
          {entry.strategy}
        </span>
        <span className="tnum mt-0.5 block text-xs text-muted-foreground">
          {formatTimestamp(entry.backtest_start_time * 1000)}
        </span>
        <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{entry.filename}</span>
        {entry.notes ? <span className="mt-1 block text-xs text-foreground/80">{entry.notes}</span> : null}
      </button>
      <div className="absolute top-2 right-2 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`编辑备注:${entry.strategy}`}
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label={`删除结果:${entry.strategy}`}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Left column: backtest result files with edit-notes and delete actions. */
export function BacktestHistoryList({ selectedFile, onSelect }: BacktestHistoryListProps) {
  const history = useBacktestHistory();
  const updateNotes = useUpdateBacktestNotes();
  const deleteFile = useDeleteBacktestFile();

  const [editing, setEditing] = useState<BacktestHistoryEntry | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [deleting, setDeleting] = useState<BacktestHistoryEntry | null>(null);

  const openEdit = (entry: BacktestHistoryEntry) => {
    setEditing(entry);
    setNotesDraft(entry.notes ?? "");
  };

  const saveNotes = () => {
    if (!editing) return;
    updateNotes.mutate(
      { file: editing.filename, strategy: editing.strategy, notes: notesDraft },
      {
        onSuccess: () => {
          toast.success("备注已保存");
          setEditing(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const file = deleting.filename;
    deleteFile.mutate(file, {
      onSuccess: () => {
        toast.success("已删除回测结果");
        if (selectedFile === file) onSelect(null);
        setDeleting(null);
      },
      onError: (e) => {
        toast.error(e.message);
        setDeleting(null);
      },
    });
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">历史结果</CardTitle>
        <CardDescription>选择一项查看详细回测数据</CardDescription>
      </CardHeader>
      <CardContent>
        {history.isError ? (
          <ErrorAlert title="回测历史加载失败" error={history.error} onRetry={() => history.refetch()} />
        ) : history.isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="加载中">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] rounded-md" />
            ))}
          </div>
        ) : (history.data ?? []).length === 0 ? (
          <EmptyState title="还没有回测结果" description="展开「新建回测」运行第一次回测" />
        ) : (
          <ScrollArea className="max-h-[600px] pr-2">
            <div className="space-y-2">
              {(history.data ?? []).map((entry) => (
                <HistoryRow
                  key={entry.filename}
                  entry={entry}
                  active={entry.filename === selectedFile}
                  onSelect={() => onSelect(entry.filename)}
                  onEdit={() => openEdit(entry)}
                  onDelete={() => setDeleting(entry)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* 编辑备注 */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑备注</DialogTitle>
            <DialogDescription>为 {editing?.strategy ?? ""} 的回测结果添加备注说明。</DialogDescription>
          </DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={3}
            placeholder="例如:调参后验证波动率降低…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button onClick={saveNotes} disabled={updateNotes.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除回测结果?</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 {deleting ? `${deleting.strategy}(${deleting.filename})` : "该条记录"} 的结果文件,此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleteFile.isPending}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
