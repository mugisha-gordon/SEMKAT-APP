import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import MessageDialog from "./MessageDialog";
import { useAuth } from "@/context/AuthContext";

interface MessageAgentButtonProps {
  /** User or agent ID to message (works for any user) */
  agentId: string;
  agentName?: string;
  /** Button label: "Message" for any user, "Message Agent" when peer is known to be an agent */
  label?: string;
  variant?: "default" | "hero" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const MessageAgentButton = ({
  agentId,
  agentName,
  label = "Message",
  variant = "hero",
  size = "default",
  className = "",
}: MessageAgentButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      // Redirect to auth if not logged in
      window.location.href = "/auth";
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`gap-2 ${className}`}
        onClick={handleClick}
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </Button>

      {user && (
        <MessageDialog
          open={open}
          onOpenChange={setOpen}
          otherUserId={agentId}
          otherUserName={agentName}
        />
      )}
    </>
  );
};

export default MessageAgentButton;
