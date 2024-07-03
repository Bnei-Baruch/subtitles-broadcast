async function GetFileUid(languageCode, sourceUid) {
    let sourceUrl = `https://kabbalahmedia.info/backend/content_units?id=${sourceUid}&with_files=true`;
    const sourceResponse = await fetch(sourceUrl);
    if (!sourceResponse.ok) {
        throw new Error(`Fetch failed with status ${sourceResponse.status}`);
    }
    const sourceData = await sourceResponse.json();
    let fileUid;
    if (sourceData.hasOwnProperty("content_units")) {
        const contentUnits = sourceData["content_units"];
        contentUnits.forEach((contentUnit) => {
            if (contentUnit.hasOwnProperty("files")) {
                const files = contentUnit["files"];
                files.forEach((file) => {
                    if (languageCode === file["language"] 
                        && file["type"] === "text"
                        && file["mimetype"] === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                            fileUid = file["id"];
                            console.log(file["id"]);
                        }
                });
            }
        });
    }
    return fileUid;
}
  
export default GetFileUid;
  