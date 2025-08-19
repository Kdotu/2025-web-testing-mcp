import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface StopConfirmDialogProps {
  isOpen: boolean;
  testUrl: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StopConfirmDialog({
  isOpen,
  testUrl,
  onConfirm,
  onCancel
}: StopConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-[#F8F6FF] rounded-2xl border border-gray-200 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-primary">
            테스트 중단 확인
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            정말 테스트를 중단하시겠습니까?
            <br />
            <span className="font-medium text-foreground mt-2 block">
              {testUrl}
            </span>
            <br />
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="neu-button" onClick={onCancel}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction 
            className="neu-button-primary bg-orange-500 hover:bg-orange-600 text-white"
            onClick={onConfirm}
          >
            중단
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 