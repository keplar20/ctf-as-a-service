import { ChallengeForm } from "../challenge-form";
import { createChallenge } from "../actions";

export default function NewChallengePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">New challenge</h2>
      <ChallengeForm action={createChallenge} submitLabel="Create" />
    </div>
  );
}
