import { useTranslations } from "next-intl";

interface PostComposerFooterProps {
  selectedCount: number;
  onPost: () => void;
  isPosting: boolean;
  isDisabled: boolean;
  onSubmitForApproval?: () => void;
  isSubmittingForApproval?: boolean;
}

export function PostComposerFooter({
  selectedCount,
  onPost,
  isPosting,
  isDisabled,
  onSubmitForApproval,
  isSubmittingForApproval = false,
}: PostComposerFooterProps) {
  const t = useTranslations("composer");
  return (
    <div className="flex flex-none items-center justify-between border-t border-gray-200 px-6 py-4">
      <span className="text-sm text-gray-500">
        {t("channelsSelected", { count: selectedCount })}
      </span>
      <div className="flex items-center gap-2">
        {onSubmitForApproval && (
          <button
            onClick={onSubmitForApproval}
            disabled={isDisabled || isSubmittingForApproval}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmittingForApproval ? t("submittingForApproval") : t("submitForApproval")}
          </button>
        )}
        <button
          onClick={onPost}
          disabled={isDisabled || isPosting}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPosting ? t("posting") : t("post")}
        </button>
      </div>
    </div>
  );
}
