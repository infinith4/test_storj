const message: string = "Hello, world!";
console.log(message)

import { promisify } from 'util';
import { exec as childExec } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv'
dotenv.config()

const exec = promisify(childExec);

const sourceUploadDir = process.env.SOURCE_UPLOAD_DIR as string;
const uploadBucketNameList = (process.env.UPLOAD_BUCKET_NAME_LIST as string).split(",");
const ignoreFileNameList = (process.env.IGNORE_FILE_NAME_LIST as string).split(",");

console.log(uploadBucketNameList);
console.log(ignoreFileNameList);

interface FileList {
  file_list: Array<{ file_size?: number; file_name?: string; file_path?: string; is_same_size?: boolean }>;
}

async function main(uploadBucketName: string) {
  console.log(`---------upload_bucket_name: ${uploadBucketName}--------------------`);
  
  let storjLsJson: FileList = { file_list: [] };
  let localFilesJson: FileList = { file_list: [] };
  let localFilesUploadCheckJson: FileList = { file_list: [] };

  // Fetch the list of files in the Storj bucket
  const cmd = `rclone ls storj:${uploadBucketName}`;
  const res = await exec(cmd);

  const lsStdout = res.stdout.split(/\n/);
  for (const line of lsStdout) {
    if (line !== '') {
      storjLsJson.file_list.push({
        file_size: Number(line.trim().split(/\s/)[0]),
        file_name: line.replace(/\s*\d+/, '').trim()
      });
    }
  }
  
  console.log(`--------storj_ls_json-------: `);

  // Get the list of local files
  const listFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(dirent =>
      dirent.isFile() ? [`${dir}/${dirent.name}`] : listFiles(`${dir}/${dirent.name}`)
    );
    
  const localFiles = listFiles(sourceUploadDir);
  let localFileCount = 0;

  for (const localFilePath of localFiles) {
    let localFileName = path.basename(localFilePath);
    if (ignoreFileNameList.includes(localFileName)) {
      continue;
    }
    localFileCount++;

    const stat = fs.statSync(localFilePath);
    localFilesJson.file_list.push({ file_path: localFilePath });

    const rootDirName = localFilePath.split("/")[0];
    const localFilePathRemoveSourceDir = localFilePath.replace(`${rootDirName}/`, "");

    for (const storjFile of storjLsJson.file_list) {
      if (storjFile.file_name === localFilePathRemoveSourceDir) {
        if (storjFile.file_size === stat.size) {
          localFilesUploadCheckJson.file_list.push({ file_path: localFilePath, is_same_size: true });
          break;
        } else {
          const storjExistRegexFileList = filterArray(
            storjLsJson.file_list.map(c => c.file_name as string),
            `*${localFilePathRemoveSourceDir}_*`
          );

          if (storjExistRegexFileList.length === 0) {
            localFilesUploadCheckJson.file_list.push({ file_path: localFilePath, is_same_size: false });
            break;
          }

          for (const storjRegexFilePath of storjExistRegexFileList) {
            const storjRegexFileList = storjLsJson.file_list.find(({ file_name }) => file_name === storjRegexFilePath);
            const isSameExistFileSize = storjRegexFileList?.file_size === fs.statSync(localFilePath).size;

            if (isSameExistFileSize) {
              localFilesUploadCheckJson.file_list.push({ file_path: localFilePath, is_same_size: isSameExistFileSize });
              break;
            }
          }
        }
      }
    }
  }

  console.log(`local_file_count: ${localFileCount}; local_files_upload_check_json: ${localFilesUploadCheckJson.file_list.length}`);
  console.log(`Is local_file_count equals storj_ls_json.file_list.length: ${storjLsJson.file_list.length === localFileCount}`);

  // Filter out the local files whose file_path matches and is_same_size is false in localFilesUploadCheckJson
  const uploadFileJson = localFilesJson.file_list.filter(localFile => {
    const uploadCheckFile = localFilesUploadCheckJson.file_list.find(uploadCheck => uploadCheck.file_path === localFile.file_path);
    return !(uploadCheckFile && uploadCheckFile.is_same_size === false);
  });

  if (uploadFileJson.length > 0) {
    console.log(`Filtered local_files_json: ${JSON.stringify(uploadFileJson, null, 2)}`);
  } else {
    console.log(`No files to upload after filtering`);
  }

  for (const uploadFileVal of uploadFileJson) {
    const rootDirName = uploadFileVal.file_path!.split("/")[0];
    const remoteFilePath = uploadFileVal.file_path!.replace(`${rootDirName}/`, "");
    let remoteDirPath = path.dirname(remoteFilePath);
    const remoteFileName = path.basename(remoteFilePath);

    if (ignoreFileNameList.includes(remoteFileName)) {
      continue;
    }

    if (remoteDirPath === ".") {
      remoteDirPath = "";
    }

    console.log(`remote_dir_path: ${remoteDirPath}`);
    

    let copyDir = "";
    const uploadFile = localFilesUploadCheckJson.file_list.find(c => c.file_path === uploadFileVal.file_path);

    if (uploadFile && uploadFile.is_same_size) {
      copyDir = `/${remoteFileName}_${new Date().toISOString()}`;
    }

    const copyFileCmdStr = `rclone copy --progress '${uploadFileVal.file_path}' storj:'${uploadBucketName}/${remoteDirPath}${copyDir}'`;  
    console.log(copyFileCmdStr);
    const resRcloneCopyCmd = await exec(copyFileCmdStr);
    console.log(resRcloneCopyCmd.stdout);
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function convertWildcardStringToRegExp(expression: string): RegExp {
  const terms = expression.split('*');
  let trailingWildcard = false;
  let expr = '';

  for (let i = 0; i < terms.length; i++) {
    if (terms[i]) {
      if (i > 0 && terms[i - 1]) {
        expr += '.*';
      }
      trailingWildcard = false;
      expr += escapeRegExp(terms[i]);
    } else {
      trailingWildcard = true;
      expr += '.*';
    }
  }

  if (!trailingWildcard) {
    expr += '.*';
  }

  return new RegExp('^' + expr + '$', 'i');
}

function filterArray(array: string[], expression: string): string[] {
  const regex = convertWildcardStringToRegExp(expression);
  return array.filter(item => regex.test(item));
}

for (const uploadBucketName of uploadBucketNameList) {
  main(uploadBucketName).catch(e => console.error(e));
}
