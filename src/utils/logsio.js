import fs from "fs-extra";

const updateLog = (data, fileName = "Monitoring data.json") => {
  try {
    const logs = JSON.parse(fs.readFileSync(fileName, "utf-8"));
    fs.outputFileSync(
      fileName,
      JSON.stringify(
        logs.map((e) => {
          return e.id_sub_source === data.id_sub_source && !e.id_data
            ? { ...e, ...data }
            : e;
        }),
        null,
        2
      )
    );
  } catch (e) {}
};

const writeLog = (data, fileName = "Monitoring data.json") => {
  let logs = [];

  try {
    logs = JSON.parse(fs.readFileSync(fileName, "utf-8"));
  } catch (e) {}

  logs.push(data);
  fs.outputFileSync(fileName, JSON.stringify(logs, null, 2));
};

const infoLog = (
  log,
  id_data,
  status,
  error,
  process_name,
  fileName = "Monitoring log error.json"
) => {
  writeLog(
    {
      Crawlling_time: log.Crawlling_time,
      id_project: log.id_project,
      project: log.project,
      sub_project: log.sub_project,
      source_name: log.source_name,
      sub_source_name: log.sub_source_name,
      id_sub_source: log.id_sub_source,
      id_data,
      process_name: process_name ? process_name : "Crawling",
      status,
      type_error: error ? error.name : "",
      message: error ? error.message : "",
      assign: log.assign,
    },
    fileName
  );
};

export { updateLog, writeLog, infoLog };
