/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as chai from "chai";
import { Guid, GuidString } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { ProjectShareClient, ProjectShareFile, ProjectShareFileQuery, ProjectShareFolder, ProjectShareFolderQuery, RecycleOption } from "../ProjectShareClient";
import { TestConfig } from "./TestConfig";

chai.should();

/**
 * Project Share Client API TODOs:
 * + Add an id field, and replace all wsgIds with ids - including parentFolderWsgId
 */
const mainTestFolderName: string = `${Guid.createValue()}_testFolder`;
const testFolderAName = "2A";
const testFolderBName = "2B";
const testFile1Name = "example1.txt";
const testFile2Name = "example2.jpg";
const testFile3Name = "example3.jpg";
const testFile4Name = "example4.txt";

const createFoldersWithFiles = async (projectShareClient: ProjectShareClient, requestContext: AuthorizedClientRequestContext, projectId: string, parentFolderId: any): Promise<void> => {
  const testFolder2A = new ProjectShareFolder();
  testFolder2A.name = testFolderAName;
  const folder2A = await projectShareClient.createFolder(requestContext, projectId, parentFolderId, testFolder2A);

  const testFolder2B = new ProjectShareFolder();
  testFolder2B.name = testFolderBName;
  const folder2B = await projectShareClient.createFolder(requestContext, projectId, parentFolderId, testFolder2B);

  const testFile1 = new ProjectShareFile();
  testFile1.name = testFile1Name;
  testFile1.size = 32;
  testFile1.description = "test";

  const testFile2 = new ProjectShareFile();
  testFile2.name = testFile2Name;
  testFile2.size = 32;
  testFile2.description = "test";

  const testFile3 = new ProjectShareFile();
  testFile3.name = testFile3Name;
  testFile3.size = 32;
  testFile3.description = "test";

  const testFile4 = new ProjectShareFile();
  testFile4.name = testFile4Name;
  testFile4.size = 32;
  testFile4.description = "test";

  const fileA: ProjectShareFile = await projectShareClient.createFile(requestContext, projectId, folder2A.wsgId, testFile1); // create new file with file exist property as false
  const dataA = { name: "John", age: 30, city: "New York" };
  await projectShareClient.uploadContentInFile(requestContext, projectId, fileA, JSON.stringify(dataA)); // upload content into file

  const file2A: ProjectShareFile = await projectShareClient.createFile(requestContext, projectId, folder2A.wsgId, testFile2); // create new file with file exist property as false
  const data2A = {};
  await projectShareClient.uploadContentInFile(requestContext, projectId, file2A, JSON.stringify(data2A)); // upload content into file

  const file3A: ProjectShareFile = await projectShareClient.createFile(requestContext, projectId, folder2A.wsgId, testFile3); // create new file with file exist property as false
  const data3A = {};
  await projectShareClient.uploadContentInFile(requestContext, projectId, file3A, JSON.stringify(data3A)); // upload content into file

  const fileB: ProjectShareFile = await projectShareClient.createFile(requestContext, projectId, folder2B.wsgId, testFile4);
  const dataB = { name: "xyz", age: 31, city: "aus" };
  await projectShareClient.uploadContentInFile(requestContext, projectId, fileB, JSON.stringify(dataB));
};

describe("ProjectShareClient (#integration)", () => {
  const projectShareClient: ProjectShareClient = new ProjectShareClient();
  let projectId: GuidString;

  let requestContext: AuthorizedClientRequestContext;

  before(async () => {
    requestContext = await TestConfig.getAuthorizedClientRequestContext();

    const project = await TestConfig.queryProject(requestContext, "iModelJsIntegrationTest");
    projectId = project.wsgId;
  });

  beforeEach(async () => {
    const testFolder = new ProjectShareFolder();
    testFolder.name = mainTestFolderName;
    await projectShareClient.createFolder(requestContext, projectId, projectId, testFolder); // Create a folder
  });

  afterEach(async () => {
    const folders: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().startsWithPathAndNameLike(projectId, "/", mainTestFolderName));
    if (folders.length === 1 && folders[0].name === mainTestFolderName) {
      await projectShareClient.deleteFolder(requestContext, projectId, folders[0].wsgId);
    }
  });

  // query folders with different options
  it("should be able to get folders in root folder", async () => {
    // arrange & act
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));

    // assert
    const foundFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    chai.assert.isDefined(foundFolder);
  });

  it("should be able to count folders in the root folder after adding a new folder", async () => {
    // arrange
    const newFolderName = `${Guid.createValue()}_newFolder`;
    const testFolder = new ProjectShareFolder();
    testFolder.name = newFolderName;
    const newFolder = await projectShareClient.createFolder(requestContext, projectId, projectId, testFolder); // Create a folder

    // act
    const foldersInRootFolderAfterNewFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inPath(projectId, "/"));

    // assert
    chai.assert.isAtLeast(foldersInRootFolderAfterNewFolder.length, 2);
    const res = await projectShareClient.deleteFolder(requestContext, projectId, newFolder.wsgId); // Permanent deleting Folder.
    chai.assert.isUndefined(res);
  });

  it("should be able to get folders in folder", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);

    // act
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));

    // assert
    chai.assert.strictEqual(folders.length, 2);
  });

  it("should be able to query folders by WsgIds", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const foundedFolders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(foundedFolders.length, 2);
    const folder2A = foundedFolders.find((x) => x.name === testFolderAName) ?? foundedFolders[0];
    const folder2B = foundedFolders.find((x) => x.name === testFolderBName) ?? foundedFolders[0];

    // act
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().byWsgIds(folder2A.wsgId, folder2B.wsgId));

    // assert
    chai.assert.strictEqual(2, folders.length);
    const foundFolder2A = folders.find((x) => x.wsgId === folder2A.wsgId);
    const foundFolder2B = folders.find((x) => x.wsgId === folder2B.wsgId);
    chai.assert.strictEqual(foundFolder2A?.name, folder2A.name);
    chai.assert.strictEqual(foundFolder2B?.name, folder2B.name);
  });

  it("should be able to query folders in path", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const foundedFolders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(foundedFolders.length, 2);
    const folder2A = foundedFolders.find((x) => x.name === testFolderAName) ?? foundedFolders[0];
    const folder2B = foundedFolders.find((x) => x.name === testFolderBName) ?? foundedFolders[0];

    // act
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inPath(projectId, mainTestFolderName));

    // assert
    chai.assert.strictEqual(2, folders.length);
    const foundFolder2A = folders.find((x) => x.wsgId === folder2A.wsgId);
    const foundFolder2B = folders.find((x) => x.wsgId === folder2B.wsgId);
    chai.assert.strictEqual(foundFolder2A?.name, folder2A.name);
    chai.assert.strictEqual(foundFolder2B?.name, folder2B.name);
  });

  it("should be able to query folders in folder with name like", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const foundedFolders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(foundedFolders.length, 2);
    const folder2A = foundedFolders.find((x) => x.name === testFolderAName) ?? foundedFolders[0];
    const folder2B = foundedFolders.find((x) => x.name === testFolderBName) ?? foundedFolders[0];

    // act
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolderWithNameLike(mainFolder.wsgId, "2*"));

    // assert
    chai.assert.strictEqual(2, folders.length);
    const foundFolder2A = folders.find((x) => x.wsgId === folder2A.wsgId);
    const foundFolder2B = folders.find((x) => x.wsgId === folder2B.wsgId);
    chai.assert.strictEqual(foundFolder2A?.name, folder2A.name);
    chai.assert.strictEqual(foundFolder2B?.name, folder2B.name);
  });

  it("should be able to query folders which start with path and name like", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");
    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);

    // act & assert
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().startsWithPathAndNameLike(projectId, mainTestFolderName, testFolderAName));
    chai.assert.strictEqual(1, folders.length);
    const foundFolder2A = folders[0];
    chai.assert.strictEqual(foundFolder2A.name, testFolderAName);
    const folders2 = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().startsWithPathAndNameLike(projectId, mainTestFolderName, "*"));
    chai.assert.strictEqual(2, folders2.length);
  });

  // folder remove
  it("should be able to permanent delete a folder", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    // act
    const res = await projectShareClient.deleteFolder(requestContext, projectId, mainFolder.wsgId); // Permanent deleting Folder.

    // assert
    chai.assert.isUndefined(res);
    const foldersAfterDelete = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().startsWithPathAndNameLike(projectId, "/", mainFolder.name)); // assert folders amount after delete
    const result = foldersAfterDelete.find((x) => x.wsgId === mainFolder.wsgId);
    chai.assert.equal(result, undefined);
  });

  it("should be able to send folder to recycle bin", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    // act
    await projectShareClient.deleteFolder(requestContext, projectId, mainFolder.wsgId, RecycleOption.SendToRecycleBin); // Move folder, to recycle bin.

    // assert
    const foldersAfterDelete = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().startsWithPathAndNameLike(projectId, "/", mainFolder.name)); // assert folders amount after delete
    const result = foldersAfterDelete.find((x) => x.wsgId === mainFolder.wsgId);
    chai.assert.equal(result, undefined);
  });

  // query files with different options
  it("should be able to get files in the root folder", async () => {
    // arrange
    const testFile = new ProjectShareFile();
    testFile.name = `${Guid.createValue()}_file.txt`;
    testFile.size = 32;
    testFile.description = "test";
    const file: ProjectShareFile = await projectShareClient.createFile(requestContext, projectId, projectId, testFile); // create new file with file exist property as false
    const data = { name: "John", age: 30, city: "New York" };

    // act
    const changedFile = await projectShareClient.uploadContentInFile(requestContext, projectId, file, JSON.stringify(data)); // upload content into file
    const filesInRootFolderAfterNewFile: ProjectShareFolder[] = await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFolderQuery().startsWithPathAndNameLike(projectId, "/", "*"));

    // assert
    chai.assert.equal(changedFile.fileExists, true);
    const foundFolder = filesInRootFolderAfterNewFile.find((x) => x.wsgId === file.wsgId);
    chai.assert.isDefined(foundFolder);
    const res = await projectShareClient.deleteFile(requestContext, projectId, file.wsgId); // Permanent deleting File.
    chai.assert.isUndefined(res);
  });

  it("should be able to query files in folder", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(folders.length, 2);
    const folder2A = folders.find((x) => x.name === testFolderAName) ?? folders[0];

    // act
    const files = await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().inFolder(folder2A.wsgId));

    // assert
    chai.assert(files);
    chai.assert.strictEqual(files.length, 3);
  });

  it("should be able to query files starts with path", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");
    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(folders.length, 2);
    const folder2A = folders.find((x) => x.name === testFolderAName) ?? folders[0];

    // act
    const files = await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().startsWithPath(projectId, `${mainTestFolderName}/${folder2A.name}`));

    // assert
    chai.assert(files);
    chai.assert.strictEqual(files.length, 3);
  });

  it("should be able to query files in folder with name like", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");
    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(folders.length, 2);
    const folder2A = folders.find((x) => x.name === testFolderAName) ?? folders[0];

    // act
    const files = await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().inFolderWithNameLike(folder2A.wsgId, testFile2Name.split(".")[0]));

    // assert
    chai.assert(files);
    chai.assert.strictEqual(files.length, 1);
    const firstImage = files[0];
    chai.assert.strictEqual(firstImage.name, testFile2Name);
  });

  it("should be able to query files which starts with path and name like", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");
    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(folders.length, 2);
    const folder2A = folders.find((x) => x.name === testFolderAName) ?? folders[0];

    // act
    const files = await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().startsWithPathAndNameLike(projectId, `${mainTestFolderName}/${folder2A.name}`, testFile3Name.split(".")[0]));

    // assert
    chai.assert(files);
    chai.assert.strictEqual(files.length, 1);
    const secondImage = files[0];
    chai.assert.strictEqual(secondImage.name, testFile3Name);
  });

  it("should be able to query files by WsgIds", async () => {
    // arrange
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");
    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);
    const folders = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inFolder(mainFolder.wsgId));
    chai.assert.strictEqual(folders.length, 2);
    const folder2A = folders.find((x) => x.name === testFolderAName) ?? folders[0];
    const files = await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().inFolder(folder2A.wsgId));
    const firstImage = files.find((x) => x.name === testFile2Name) ?? files[0];
    const secondImage = files.find((x) => x.name === testFile3Name) ?? files[0];

    // act
    const foundFiles = await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().byWsgIds(firstImage.wsgId, secondImage.wsgId));

    // assert
    chai.assert.strictEqual(files.length, 3);
    const foundFirstImage = foundFiles[0];
    chai.assert.strictEqual(foundFirstImage.name, testFile2Name);
    const foundSecondImage = foundFiles[1];
    chai.assert.strictEqual(foundSecondImage.name, testFile3Name);
  });

  // file remove
  it("should be able to permanent delete file", async () => {
    // arrange
    const foldersInRootFolder = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    const testFile = new ProjectShareFile();
    testFile.name = "sap.txt";
    testFile.size = 32;
    testFile.description = "test";

    const fileA: ProjectShareFile = await projectShareClient.createFile(requestContext, projectId, mainFolder.wsgId, testFile); // create new file with file exist property as false
    chai.assert.strictEqual(fileA.description, testFile.description);
    chai.assert.equal(fileA.size, testFile.size);
    const dataA = { name: "John", age: 30, city: "New York" };
    const changedFileA = await projectShareClient.uploadContentInFile(requestContext, projectId, fileA, JSON.stringify(dataA)); // upload content into file
    chai.assert.equal(changedFileA.fileExists, true);

    // act
    const resA = await projectShareClient.deleteFile(requestContext, projectId, fileA.wsgId); // Permanent deleting File.

    // assert
    chai.assert.isUndefined(resA);
  });

  it("should be able to send file to recycle bin", async () => {
    const foldersInRootFolder = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");

    const testFile = new ProjectShareFile();
    testFile.name = "sap.txt";
    testFile.size = 32;
    testFile.description = "test";

    const fileB: ProjectShareFile = await projectShareClient.createFile(requestContext, projectId, mainFolder.wsgId, testFile);
    chai.assert.strictEqual(fileB.description, testFile.description);
    chai.assert.equal(fileB.size, testFile.size);
    const dataB = { name: "xyz", age: 31, city: "aus" };
    const changedFileB = await projectShareClient.uploadContentInFile(requestContext, projectId, fileB, JSON.stringify(dataB));
    chai.assert.equal(changedFileB.fileExists, true);

    // act
    const resB = await projectShareClient.deleteFile(requestContext, projectId, fileB.wsgId, RecycleOption.SendToRecycleBin); // file move to recycleBin.

    // assert
    chai.assert.isNotNull(resB);
  });

  // Gets the custom property object based on the 'Name' property
  function grabCustomProperty(file: ProjectShareFile, name: string): any {
    return file.customProperties.find((customProp: any) => customProp.Name === name);
  }

  it("should be able to CRUD custom properties", async () => {
    const foldersInRootFolder: ProjectShareFolder[] = await projectShareClient.getFolders(requestContext, projectId, new ProjectShareFolderQuery().inRootFolder(projectId));
    const mainFolder = foldersInRootFolder.find((x) => x.name === mainTestFolderName);
    if (!mainFolder) throw new TypeError("MainFolder is undefined");
    await createFoldersWithFiles(projectShareClient, requestContext, projectId, mainFolder.wsgId);

    const firstImageFile = (await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().startsWithPathAndNameLike(projectId, `${mainTestFolderName}/${testFolderAName}`, "example2")))[0];

    // Create custom properties and validate returned file
    const createCustomProperties = [
      {
        Name: `TestKey${Guid.createValue()}`, // eslint-disable-line @typescript-eslint/naming-convention
        Value: "TestValue1", // eslint-disable-line @typescript-eslint/naming-convention
      },
      {
        Name: `TestKey${Guid.createValue()}`, // eslint-disable-line @typescript-eslint/naming-convention
        Value: "TestValue2", // eslint-disable-line @typescript-eslint/naming-convention
      },
    ];
    const retFile: ProjectShareFile = await projectShareClient.updateCustomProperties(requestContext, projectId, firstImageFile, createCustomProperties);
    chai.assert.isDefined(retFile.customProperties);
    chai.assert.isAtLeast(retFile.customProperties.length, 2);
    const firstPropFile = grabCustomProperty(retFile, createCustomProperties[0].Name);
    chai.assert.isDefined(firstPropFile);
    chai.assert.strictEqual(firstPropFile.Value, createCustomProperties[0].Value);
    const secondPropFile = grabCustomProperty(retFile, createCustomProperties[1].Name);
    chai.assert.isDefined(secondPropFile);
    chai.assert.strictEqual(secondPropFile.Value, createCustomProperties[1].Value);

    // Get the updated file again and validate it
    const retFile2: ProjectShareFile = (await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().byWsgIds(firstImageFile.wsgId)))[0];
    chai.assert.isAtLeast(retFile2.customProperties.length, 2);
    const firstPropFile2 = grabCustomProperty(retFile2, createCustomProperties[0].Name);
    chai.assert.isDefined(firstPropFile2, `The ${createCustomProperties[0].Name} does not exist on the server but it should`);
    chai.assert.strictEqual(firstPropFile2.Value, createCustomProperties[0].Value);
    const secondPropFile2 = grabCustomProperty(retFile2, createCustomProperties[1].Name);
    chai.assert.isDefined(secondPropFile2, `The ${createCustomProperties[1].Name} does not exist on the server but it should`);
    chai.assert.strictEqual(secondPropFile2.Value, createCustomProperties[1].Value);

    // Update a custom property and validate
    const updateCustomProperties = [
      {
        Name: createCustomProperties[0].Name, // eslint-disable-line @typescript-eslint/naming-convention
        Value: "TestUpdatedValue1", // eslint-disable-line @typescript-eslint/naming-convention
      },
    ];
    const retFile3: ProjectShareFile = await projectShareClient.updateCustomProperties(requestContext, projectId, firstImageFile, updateCustomProperties);
    chai.assert.isAtLeast(retFile3.customProperties.length, 2);
    const firstPropFile3 = grabCustomProperty(retFile3, createCustomProperties[0].Name);
    chai.assert.isDefined(firstPropFile3);
    chai.assert.strictEqual(firstPropFile3.Value, updateCustomProperties[0].Value);
    const secondPropFile3 = grabCustomProperty(retFile3, createCustomProperties[1].Name);
    chai.assert.isDefined(secondPropFile3);
    chai.assert.strictEqual(secondPropFile3.Value, createCustomProperties[1].Value);

    // Get the updated file again and validate it
    const retFile4: ProjectShareFile = (await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().byWsgIds(firstImageFile.wsgId)))[0];
    chai.assert.isAtLeast(retFile4.customProperties.length, 2);
    const firstPropFile4 = grabCustomProperty(retFile4, createCustomProperties[0].Name);
    chai.assert.isDefined(firstPropFile4);
    chai.assert.strictEqual(firstPropFile4.Value, updateCustomProperties[0].Value);
    const secondPropFile4 = grabCustomProperty(retFile4, createCustomProperties[1].Name);
    chai.assert.isDefined(secondPropFile4);
    chai.assert.strictEqual(secondPropFile4.Value, createCustomProperties[1].Value);

    // Delete a custom property and validate
    const deleteProperties = [createCustomProperties[0].Name, createCustomProperties[1].Name];
    const retFile5: ProjectShareFile = await projectShareClient.updateCustomProperties(requestContext, projectId, firstImageFile, undefined, deleteProperties);

    // Ensure the two properties no longer exist
    chai.assert.isUndefined(grabCustomProperty(retFile5, createCustomProperties[0].Name));
    chai.assert.isUndefined(grabCustomProperty(retFile5, createCustomProperties[1].Name));

    // Get the updated file again and validate it
    const retFile6: ProjectShareFile = (await projectShareClient.getFiles(requestContext, projectId, new ProjectShareFileQuery().byWsgIds(firstImageFile.wsgId)))[0];
    chai.assert.isUndefined(grabCustomProperty(retFile6, createCustomProperties[0].Name));
    chai.assert.isUndefined(grabCustomProperty(retFile6, createCustomProperties[1].Name));
  });

});
