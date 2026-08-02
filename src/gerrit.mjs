async function fetchGerritJSON(url) {
  const res = await fetch(url);
  const text = await res.text();

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

export async function getGerritInfo(change_id){
  const base = process.env.BASE_URL;
  const protocol = process.env.PROTOCOL;
  const url = `${protocol}://${base}`

  let color, change_url, change_created, change_updated, change_author_name, change_author_icon, change_commit_subject, change_commit_message, base_url_meta_description, base_url_meta_icon;
  
  const changeInfo = await fetchGerritJSON(`${url}/changes/${change_id}`);
  const changeMessage = await fetchGerritJSON(`${url}/changes/${change_id}/message`);
  const changeDetail = await fetchGerritJSON(`${url}/changes/${change_id}/detail`);
  const changeMergeable = await fetchGerritJSON(`${url}/changes/${change_id}/revisions/current/mergeable`);
  base_url_meta_icon = `https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Gerrit_icon.svg/960px-Gerrit_icon.svg.png`

  change_url = `${url}/c/${change_id}`;
  change_created = changeInfo.created;

  const [change_misc_status, statusColor] = getStatus(changeInfo, changeMergeable);

  base_url_meta_description = change_misc_status; // THIS IS NOT HOW IT WILL BE FOR THE FINAL VERSION

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
        message: change_commit_message, // todo: we need to properly do '\n' stuff and cut off at 'Change-Id:' stuff
      },
    },
    base_url: {
      meta: {
        description: base_url_meta_description, // examples for future me: "Merged | CR: +2, V: +1, CO: A, CC: NV, RE: S", "Active | CR: +1, V: +1, NUC: U, CO: A, CC: NV, RE: S". where CR=Code-Review, V=Verified, NUC=No-Unresolved-Comments, CO=Code-Owners, CC=Code-Coverage, RE=Review-Enforcement, U=Unsatisfied, NV=No Votes, S=Satisfied, A=Approved
        icon: base_url_meta_icon // /favicon.ico, fallback to wikimedia svg
      }
    }
  };
}