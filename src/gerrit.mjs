class GerritNotFoundError extends Error {}

async function fetchGerritJSON(url) {
  const res = await fetch(url);
  const text = await res.text();

  if (res.status === 404) {
    throw new GerritNotFoundError(text);
  }

  const cleaned = text.startsWith(")]}'")
    ? text.slice(text.indexOf('\n') + 1)
    : text;

  return JSON.parse(cleaned);
}

function getStatus(changeInfo, changeMergeable) {
  switch (true) { // sorry but i thought switch case looked cleaner
    case changeInfo.status === "MERGED":
      return ["Merged", "#a4a4a4"];
    case changeInfo.status === "ABANDONED":
      return ["Abandoned", "#dadce0"];
    case Boolean(changeInfo.revert_of):
      return ["Revert", "#e8eaed"];
    case changeMergeable.mergeable === false:
      return ["Merge Conflict", "#f28b82"];
    case Boolean(changeInfo.contains_git_conflicts):
      return ["Git Conflict", "#f28b82"];
    case Boolean(changeInfo.work_in_progress):
      return ["WIP", "#bcaaa4"];
    case Boolean(changeInfo.private):
      return ["Private", "#d7aefb"];
    case Boolean(changeInfo.submittable):
      return ["Ready", "#55c374"];
    default:
      return ["Active", "#f4ce5d"];
  }
}

// SR == "submit requirements" btw
const SR_ABBREVIATIONS = {
  "Code-Review": "CR",
  "Verified": "V",
  "No-Unresolved-Comments": "NUC",
  "Code-Owners": "CO",
  "Code-Coverage": "CC",
  "Review-Enforcement": "RE",
  "Commit-Queue": "CQ",
  "Recitation-Check": "RC",
  "Lint": "L",
  "Bot-Commit": "BC",
  "Auto-Submit": "AS",
};

function formatVote(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function getLabelVoteText(label) {
  if (!label || !Array.isArray(label.all) || label.all.length === 0) return null;

  const nonZero = label.all.filter((v) => typeof v.value === "number" && v.value !== 0);
  if (nonZero.length === 0) return "NV";

  const extreme = nonZero.reduce((max, v) => (Math.abs(v.value) > Math.abs(max.value) ? v : max));
  return formatVote(extreme.value);
}

function getRequirementValue(req, labels) {
  const voteText = getLabelVoteText(labels?.[req.name]);
  if (voteText !== null) return voteText;

  if (req.status === "NOT_APPLICABLE") return null;

  if (req.name === "Code-Owners") {
    return req.status === "SATISFIED" || req.status === "OVERRIDDEN" ? "A" : "U";
  }

  return req.status === "SATISFIED" || req.status === "OVERRIDDEN" ? "S" : "U";
}

function getSubmitRequirementsSummary(changeInfo) {
  const requirements = changeInfo.submit_requirements ?? [];
  const labels = changeInfo.labels ?? {};

  const srNames = new Set(requirements.map((req) => req.name));

  const requirementParts = requirements
    .map((req) => {
      const value = getRequirementValue(req, labels);
      if (value === null) return null;
      const abbr = SR_ABBREVIATIONS[req.name] ?? req.name;
      return `${abbr}: ${value}`;
    })
    .filter(Boolean);

  const triggerVoteParts = Object.entries(labels)
    .filter(([name]) => !srNames.has(name))
    .map(([name, label]) => [name, getLabelVoteText(label)])
    .filter(([, vote]) => vote !== null && vote !== "NV")
    .map(([name, vote]) => `${SR_ABBREVIATIONS[name] ?? name}: ${vote}`);

  return [...requirementParts, ...triggerVoteParts].join(", ");
}

const FOOTER_LINE = /^[A-Za-z][\w-]*:\s/;

function stripCommitMessage(fullMessage, subject) {
  let body = fullMessage.startsWith(subject) ? fullMessage.slice(subject.length) : fullMessage;
  body = body.replace(/^\n+/, "");

  const lines = body.split("\n");
  while (lines.length > 0) {
    const last = lines[lines.length - 1];
    if (last === "" || FOOTER_LINE.test(last)) {
      lines.pop();
    } else {
      break;
    }
  }

  return lines.join("\n").replace(/\n+$/, "");
}

const GERRIT_ICON_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Gerrit_icon.svg/960px-Gerrit_icon.svg.png";

function getNotFoundInfo(url, change_id) {
  return {
    color: "#f28b82", // merge conflict color
    change: {
      url: `${url}`,
      created: "",
      updated: "",
      author: {
        name: "Unknown",
        icon: GERRIT_ICON_URL,
      },
      commit: {
        subject: "Not Found",
        message: "This change does not exist or is not visible to you.",
      },
    },
    base_url: {
      meta: {
        description: "Not Found",
        icon: GERRIT_ICON_URL,
      },
    },
    redirect: {
      text: `Change ID ${change_id} not found. Redirecting to <a href="${url}">${url}</a> in 3 seconds.`
    }
  };
}

export async function getGerritInfo(change_id) {
  const base = process.env.BASE_URL;
  const protocol = process.env.PROTOCOL;
  const url = `${protocol}://${base}`;

  let changeInfo;
  try {
    changeInfo = await fetchGerritJSON(
      `${url}/changes/${change_id}?o=SUBMIT_REQUIREMENTS&o=LABELS`
    );
  } catch (err) {
    if (err instanceof GerritNotFoundError) {
      return getNotFoundInfo(url, change_id);
    }
    throw err;
  }

  const changeMessage = await fetchGerritJSON(`${url}/changes/${change_id}/message`);
  const changeDetail = await fetchGerritJSON(`${url}/changes/${change_id}/detail`);
  const changeMergeable = await fetchGerritJSON(`${url}/changes/${change_id}/revisions/current/mergeable`);

  const change_url = `${url}/c/${change_id}`;
  const [change_misc_status, statusColor] = getStatus(changeInfo, changeMergeable);
  const requirementsSummary = getSubmitRequirementsSummary(changeInfo);

  const base_url_meta_description = requirementsSummary
    ? `${change_misc_status} | ${requirementsSummary}`
    : change_misc_status;

  return {
    color: statusColor,
    change: {
      url: change_url,
      created: changeInfo.created,
      updated: changeInfo.updated,
      author: {
        name: changeDetail.owner.name,
        icon: changeDetail.owner.avatars[2].url,
      },
      commit: {
        subject: changeMessage.subject,
        message: stripCommitMessage(changeMessage.full_message, changeMessage.subject),
      },
    },
    base_url: {
      meta: {
        description: base_url_meta_description,
        icon: GERRIT_ICON_URL,
      },
    },
    redirect: {
      text: `Redirecting to <a href="${change_url}">${change_url}</a> in 3 seconds.`
    }
  };
}