import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const options: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: "Light", value: "light", icon: <Sun className="h-4 w-4" /> },
    { label: "Dark", value: "dark", icon: <Moon className="h-4 w-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={theme === option.value ? "hero" : "outline"}
          className="flex flex-col gap-1 py-3"
          onClick={() => setTheme(option.value)}
        >
          {option.icon}
          <span className="text-xs">{option.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default ThemeToggle;

