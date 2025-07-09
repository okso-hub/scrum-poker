import { BadRequestError } from "../types/index.js";


export function validateRoomId(roomId: any): number {
  if (!roomId) {
    throw new BadRequestError("roomId is required");
  }
  
  const numericRoomId = Number(roomId);
  
  if (isNaN(numericRoomId) || numericRoomId <= 0) {
    throw new BadRequestError("roomId must be a valid positive number");
  }
  
  return numericRoomId;
}

export function validateUsername(userName: string): boolean {
  for (const pat of userRegex) {
    if (new RegExp(pat, "i").test(userName)) {
      return false;
    }
  }
  return true;
}

const userRegex =  [
  "\\b((n[\\W_]*?)+(h+[\\W_]*?)*?([yijl][\\W_]*?)+(a[\\W_]*?)*?(g[\\W_]*?)+([ae][\\W_]*?)+(r[\\W_]*?)*?(o[\\W_]*?)*?(h[\\W_]*?)*?(s[\\W_]*?)*?)+\\b",
  "\\b(k*?[\\W_]*?n+[\\W_]*?[iyl!]+[\\W_]*?h*?[\\W_]*?[bqg]+[\\W_]*?[bqg]*?[\\W_]*?[wr]*?[\\W_]*?([aeu]+[\\W_]*?h*[\\W_]*?r+|a+|u+[\\W_]*?h+)[\\W_]*?[sz]*?)+\\b",
  "\\b(?!\\bhorns\\b)h+[\\W_]*?[uo]*?[\\W_]*?h*?[\\W_]*?r+[\\W_]*?e*?[\\W_]*?n+[\\W_]*?(s+[\\W_]*?o*?[\\W_]*?e[\\W_]*?h*?[\\W_]*?n+|t+[\\W_]*?o+[\\W_]*?c+[\\W_]*?h+[\\W_]*?t+[\\W_]*?e+[\\W_]*?r+)\\b",
  "\\b((p[\\W_]*?)+(e[\\W_]*?)*?(n[\\W_]*?)+([il][\\W_]*?)+([sz][\\W_]*?)+((e[\\W_]*?)*?)([sz][\\W_]*?)*?)+\\b",
  "(?!\\b(b+\\ss\\+t\\+a\\+r\\+t\\+s*?|B A Start))\\bb\\+[\\W_]*?a*?[\\W_]*?s+[\\W_]*?[td]+[\\W_]*?a*?[\\W_]*?r+[\\W_]*?[dt]+",
  "\\bw\\+[\\W_]*?i+[\\W_]*?(x+|c+[\\W_]*?h*?s+|c*?k+[\\W_]*?s+)[\\W_]*?(a+[\\W_]*?r*?|e+[\\W_]*?r+)[\\W_]*?\\b",
  "\\bp\\+[\\W_]*?i+[\\W_]*?(s+[\\W_]*?s+|ß+)[\\W_]*?(a+[\\W_]*?r*?|e+[\\W_]*?r+)[\\W_]*?s*?\\b",
  "\\bn\\+[\\W_]*?u+[\\W_]*?t+[\\W_]*?t*?[\\W_]*?(e+[\\W_]*?n*?|n+)[\\W_]*?(b+[\\W_]*?e+[\\W_]*?n+[\\W_]*?g+[\\W_]*?e+[\\W_]*?l+)*?\\b",
  "((a[\\W_]*?)+(d+[\\W_]*?)*?(o[\\W_]*?)+(l[\\W_]*?)*?(f[\\W_]*?)+(s[\\W_]*?)*?)+",
  "(h[\\W_]*?)+(i+[\\W_]*?)*?(t[\\W_]*?)+(l[\\W_]*?)*?(e[\\W_]*?)+(r[\\W_]*?)+"
]