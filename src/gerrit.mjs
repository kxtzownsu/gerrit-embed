async function fetchGerritJSON(url) {
  const res = await fetch(url);
  const text = await res.text();

  const cleaned = text.startsWith(")]}'")
    ? text.slice(text.indexOf('\n') + 1)
    : text;

  return JSON.parse(cleaned);
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

  let change_misc_status = '';
  let statusColor = '';


  if (changeInfo.status === "MERGED") {
    change_misc_status = "Merged";
    statusColor = "#a4a4a4";
  } else if (changeInfo.status === "ABANDONED") {
    change_misc_status = "Abandoned";
    statusColor = "#dadce0";
  } else if (changeInfo.revert_of) {
    change_misc_status = "Revert";
    statusColor = "#e8eaed";
  } else if (changeMergeable.mergeable === false) {
    change_misc_status = "Merge Conflict";
    statusColor = "#f28b82";
  } else if (changeInfo.contains_git_conflicts) {
    change_misc_status = "Git Conflict";
    statusColor = "#f28b82";
  } else if (changeInfo.work_in_progress) {
    change_misc_status = "WIP";
    statusColor = "#bcaaa4";
  } else if (changeInfo.private) {
    change_misc_status = "Private";
    statusColor = "#d7aefb";
  } else if (changeInfo.submittable) {
    change_misc_status = "Ready";
    statusColor = "#55c374";
  } else {
    change_misc_status = "Active";
    statusColor = "#f4ce5d";
  }

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