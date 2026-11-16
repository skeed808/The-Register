// Small in-house word diff (longest common subsequence) and value normalisation.

export function normalise(v: string): string {
  return v
    .toLowerCase()
    .replace(/\blimited\b/g, 'ltd')
    .replace(/\blimited liability partnership\b/g, 'llp')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DiffToken {
  text: string;
  changed: boolean;
}

/** Returns tokens for a and b with words not in the LCS marked as changed. */
export function wordDiff(a: string, b: string): { a: DiffToken[]; b: DiffToken[] } {
  const A = a.split(/(\s+)/);
  const B = b.split(/(\s+)/);
  const key = (w: string) => normalise(w);
  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ta: DiffToken[] = [];
  const tb: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (key(A[i]) === key(B[j])) {
      ta.push({ text: A[i], changed: false });
      tb.push({ text: B[j], changed: false });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ta.push({ text: A[i], changed: /\S/.test(A[i]) });
      i++;
    } else {
      tb.push({ text: B[j], changed: /\S/.test(B[j]) });
      j++;
    }
  }
  while (i < n) ta.push({ text: A[i], changed: /\S/.test(A[i++]) });
  while (j < m) tb.push({ text: B[j], changed: /\S/.test(B[j++]) });
  return { a: ta, b: tb };
}
