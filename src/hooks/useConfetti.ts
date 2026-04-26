import confetti from "canvas-confetti";

export function useConfetti() {
  const fire = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#465FFF", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"],
    });
  };
  return { fire };
}
