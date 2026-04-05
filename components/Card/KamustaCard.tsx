// components/KamustaCard.tsx
import { Heart } from "lucide-react";

export default function KamustaCard({
  title = "Deep Connection",
  text = "What is a moment with me that you'll never forget?",
  type = "Question Card",
  icon: Icon = Heart,
}: {
  title?: string;
  text?: string;
  type?: string;
  icon?: any;
}) {
  return (
    <div className="relative aspect-[3/4] bg-[#f5f0e8] rounded-lg shadow-2xl p-6 flex flex-col items-center justify-center text-center border border-[#d4c8b8]">
      
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5a4a38] to-[#3d3128] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#f5f0e8]" />
      </div>

      <h4 className="font-cinzel text-lg text-[#2c2825] mb-2">
        {title}
      </h4>

      <p className="text-xs text-[#6b4423] font-crimson leading-relaxed">
        {text}
      </p>

      <div className="mt-6 pt-4 border-t border-[#d4c8b8] w-full">
        <span className="text-[10px] font-mono text-[#8b7355] uppercase tracking-wider">
          {type}
        </span>
      </div>
    </div>
  );
}