const hashes = {
  games: "",
  museum: "",
  riyadh: "",
  birthday: "",
  office: "",
  camp: "",
};

export const testClaimHashes =
  process.env.NODE_ENV === "development" ? hashes : {};
