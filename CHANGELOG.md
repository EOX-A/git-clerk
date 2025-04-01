# Changelog

## [1.7.0](https://github.com/EOX-A/git-clerk/compare/v1.6.0...v1.7.0) (2025-04-01)


### Features

* Unified all the `globalThis` git clerk related config to `globalThis.gitClerkConfig` ([#123](https://github.com/EOX-A/git-clerk/issues/123)) ([b023e20](https://github.com/EOX-A/git-clerk/commit/b023e2042cd6384992bd97dbb903ddb805598034))


### Bug Fixes

* Toast message when a duplicate fork from same origin account exist ([#122](https://github.com/EOX-A/git-clerk/issues/122)) ([3bcb0e3](https://github.com/EOX-A/git-clerk/commit/3bcb0e31d52a92204a58f37b93623bda9d2241be))

## [1.6.0](https://github.com/EOX-A/git-clerk/compare/v1.5.2...v1.6.0) (2025-03-20)


### Features

* Apply new styling, harmonize ui elements ([#116](https://github.com/EOX-A/git-clerk/issues/116)) ([481c252](https://github.com/EOX-A/git-clerk/commit/481c25239447a481e4471820749d629318106c26))

## [1.5.2](https://github.com/EOX-A/git-clerk/compare/v1.5.1...v1.5.2) (2025-03-17)


### Bug Fixes

* On initial load not getting into watch function ([#117](https://github.com/EOX-A/git-clerk/issues/117)) ([b1e0597](https://github.com/EOX-A/git-clerk/commit/b1e05978a1401cd9d9c95a1f6fe6baaccb5584ba))

## [1.5.1](https://github.com/EOX-A/git-clerk/compare/v1.5.0...v1.5.1) (2025-03-11)


### Features

* Automation through outside URL ([#113](https://github.com/EOX-A/git-clerk/issues/113)) ([311fc36](https://github.com/EOX-A/git-clerk/commit/311fc36118409225eeeb330ac5ba762e0490f03e))

## [1.5.0](https://github.com/EOX-A/git-clerk/compare/v1.4.1...v1.5.0) (2025-03-10)

Tag versions: starting with `v1.5.0`, tags (and generated Docker images) will follow the schema `v<version>` (not anymore `git-clerk-v<version>`).

### Bug Fixes

* Remove unsed hideHiddenFieldsMethod func ([#110](https://github.com/EOX-A/git-clerk/issues/110)) ([3c9d566](https://github.com/EOX-A/git-clerk/commit/3c9d566967f1046b5f69f13bab570221d929ff9a))

## [1.4.1](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.4.0...git-clerk-v1.4.1) (2025-02-26)


### Bug Fixes

* Github button text  ([#105](https://github.com/EOX-A/git-clerk/issues/105)) ([3fdc16f](https://github.com/EOX-A/git-clerk/commit/3fdc16ff4faa93da194b944a0099a00b5b9dcb66))

## [1.4.0](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.3.0...git-clerk-v1.4.0) (2025-02-25)


### Features

* `hide-show` and `resize` preview ([#104](https://github.com/EOX-A/git-clerk/issues/104)) ([88d2e14](https://github.com/EOX-A/git-clerk/commit/88d2e14d2b9ff8d8dab9703b5bf3fed78177b569))
* Rename file ([#100](https://github.com/EOX-A/git-clerk/issues/100)) ([3091d40](https://github.com/EOX-A/git-clerk/commit/3091d4004dfe96a48873684d5061998e7935be92))


### Bug Fixes

* Load config before asset bundle ([#99](https://github.com/EOX-A/git-clerk/issues/99)) ([7e26e03](https://github.com/EOX-A/git-clerk/commit/7e26e0368c08f79ec75a9afb82ef06cc71ea3f87))
* Multiple changes to file viewer ([#102](https://github.com/EOX-A/git-clerk/issues/102)) ([f6096a5](https://github.com/EOX-A/git-clerk/commit/f6096a526f2e782a4b8f05a3c3270505a91e0b4c))

## [1.3.0](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.2.4...git-clerk-v1.3.0) (2025-02-19)


### Features

* Add session rename ([#97](https://github.com/EOX-A/git-clerk/issues/97)) ([63384e4](https://github.com/EOX-A/git-clerk/commit/63384e4918e65365ed406f7d3625d90585b37e13))
* Dynamic enums and custom editors ([#67](https://github.com/EOX-A/git-clerk/issues/67)) ([7838ae5](https://github.com/EOX-A/git-clerk/commit/7838ae56f24cdcf97310c864ed4eec89eecae024))


### Bug Fixes

* Create file on enter, check if `GENERATE_ENUMS` ([#91](https://github.com/EOX-A/git-clerk/issues/91)) ([907fabd](https://github.com/EOX-A/git-clerk/commit/907fabd42e8ed39fc339e4413860b956d57b1d92))
* Disabled Add/Edit button if session is closed/merged ([#96](https://github.com/EOX-A/git-clerk/issues/96)) ([3970646](https://github.com/EOX-A/git-clerk/commit/397064672aa77f02a285aded37eb50bd12dcd67b))
* Improve config loading, rename env variables ([#95](https://github.com/EOX-A/git-clerk/issues/95)) ([0805e10](https://github.com/EOX-A/git-clerk/commit/0805e10f7c090d3e285e1aa1689c9127ca1d5af0))
* Prevent premature change event trigger ([#98](https://github.com/EOX-A/git-clerk/issues/98)) ([9dc4b75](https://github.com/EOX-A/git-clerk/commit/9dc4b753752ece6e18d1baabf87c0d217298cd51))
* **style:** Simplify file edit view and split scrolling containers ([#86](https://github.com/EOX-A/git-clerk/issues/86)) ([e3a68ec](https://github.com/EOX-A/git-clerk/commit/e3a68ec5dd3d1f79d0b0695dfabde6085192ef5c))
* Use raw preview URL in order to be able to display files hosted elsewhere ([#93](https://github.com/EOX-A/git-clerk/issues/93)) ([6badcde](https://github.com/EOX-A/git-clerk/commit/6badcde381f87b8f26135066f96c327efe6a48e9))

## [1.2.4](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.2.3...git-clerk-v1.2.4) (2025-02-07)


### Bug Fixes

* Deployment in subpath by setting BASE_URL ([#80](https://github.com/EOX-A/git-clerk/issues/80)) ([06bd9c3](https://github.com/EOX-A/git-clerk/commit/06bd9c3ce3979f47ce6fd020a07f527a968dcb0c))

## [1.2.3](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.2.2...git-clerk-v1.2.3) (2025-01-31)


### Bug Fixes

* **ci:** Use tag_name output for tagging image ([#77](https://github.com/EOX-A/git-clerk/issues/77)) ([27b9f91](https://github.com/EOX-A/git-clerk/commit/27b9f9132e812b645fca0ff1d8099f42c869d909))

## [1.2.2](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.2.1...git-clerk-v1.2.2) (2025-01-31)


### Bug Fixes

* **ci:** Add permission to publish packages to workflow ([#75](https://github.com/EOX-A/git-clerk/issues/75)) ([4598bbd](https://github.com/EOX-A/git-clerk/commit/4598bbd9a95fc2c7fec03adb87e6cbba505f84e8))

## [1.2.1](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.2.0...git-clerk-v1.2.1) (2025-01-31)


### Bug Fixes

* **ci:** Trigger image build on successful release ([#73](https://github.com/EOX-A/git-clerk/issues/73)) ([a43afc9](https://github.com/EOX-A/git-clerk/commit/a43afc9b284a418f93273fcf1bb24bf28e1dd8c9))

## [1.2.0](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.1.0...git-clerk-v1.2.0) (2025-01-31)


### Features

* **ci:** Build docker image for tags ([#72](https://github.com/EOX-A/git-clerk/issues/72)) ([760a1cb](https://github.com/EOX-A/git-clerk/commit/760a1cbf0f684d97fd6a6a950902297176a69645))


### Bug Fixes

* Use temporary fallback src url for uploaded media in order to mitigate GH availability delay ([#69](https://github.com/EOX-A/git-clerk/issues/69)) ([32f88d9](https://github.com/EOX-A/git-clerk/commit/32f88d93d3e2d5c822dda6fffaf07b51a38c2b78))

## [1.1.0](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.0.0...git-clerk-v1.1.0) (2024-12-23)


### Features

* Add dependency ([#61](https://github.com/EOX-A/git-clerk/issues/61)) ([2683fec](https://github.com/EOX-A/git-clerk/commit/2683fec476d6e0c7671080b1ebd84ab52b28d657))


### Bug Fixes

* Remove symbols from branch's slug name ([#64](https://github.com/EOX-A/git-clerk/issues/64)) ([22109df](https://github.com/EOX-A/git-clerk/commit/22109dfbc4ad9b9a7b3b937e0770ae0980ac49d2))

## [1.0.0](https://github.com/EOX-A/git-clerk/compare/git-clerk-v1.0.0-alpha.1...git-clerk-v1.0.0) (2024-12-16)


### Features

* Add file edit page with basic functionality ([958ab4b](https://github.com/EOX-A/git-clerk/commit/958ab4b801144b551d6a03097ea9e0d1dfa591ee))
* Add type navigation ([65c6683](https://github.com/EOX-A/git-clerk/commit/65c66833968313939f914a36afc3d411e494ef01))
* Adde json-form connect it with api ([755943c](https://github.com/EOX-A/git-clerk/commit/755943c10eb8d8e17e148472405361a7943e5800))
* Adde new storytelling version ([78fd4fb](https://github.com/EOX-A/git-clerk/commit/78fd4fb7a408a60f02a90e7021e3efc7188f6743))
* Added @eox/json-form with file editing ([664ddd2](https://github.com/EOX-A/git-clerk/commit/664ddd26d34dac37a9d47c926fc8227b02684291))
* Added add file feature along with UI ([66e768b](https://github.com/EOX-A/git-clerk/commit/66e768b353217f3977fe6dac99ac521b8ee57aaa))
* Added allow preview with basic storytelling preview and event for changes ([2ae080d](https://github.com/EOX-A/git-clerk/commit/2ae080d71af80633257437b24851e9b4b6dad846))
* Added baasic schema with a validator ([1ac921d](https://github.com/EOX-A/git-clerk/commit/1ac921d941f9d833613e332454f069f9dcf38d59))
* Added capability to have pending checks ([9a9e72d](https://github.com/EOX-A/git-clerk/commit/9a9e72d7d74d5caadeef01eb9ad167237a9864fd))
* Added config to fetch github cred through config.js ([2f485e0](https://github.com/EOX-A/git-clerk/commit/2f485e0e91c8027a0f1fb6bff7fe1beb5d34e3dd))
* Added create session feature ([5bfada1](https://github.com/EOX-A/git-clerk/commit/5bfada19a2d08e2ec8a4d267e2fb7908c72a6bda))
* Added duplicate feature ([9ca2ccb](https://github.com/EOX-A/git-clerk/commit/9ca2ccb0344a60c9507332772fc93ab65a7b2b13))
* Added fetch schema through URL and update it with the file content ([73dfd73](https://github.com/EOX-A/git-clerk/commit/73dfd733d725e4a539ee826fe7e345597416f858))
* Added file list page with major UI and functionality ([d7b53ef](https://github.com/EOX-A/git-clerk/commit/d7b53ef914e883e9a2ae88c9eb51bb01f33dbe0e))
* Added forking part of create session with laoding UI ([bde8dbb](https://github.com/EOX-A/git-clerk/commit/bde8dbbcc1aa1f6fe76fce17662ac49da92d6b54))
* Added global toast and implemented requesr review with github graphql ([0971685](https://github.com/EOX-A/git-clerk/commit/0971685e7e6f740235b15fd943198dc3a5489f4c))
* Added major css changes for mobile ([d2498c2](https://github.com/EOX-A/git-clerk/commit/d2498c2bd44a4eb42a8752a52f2c70b8abd458b3))
* Added major functionality for automation ([fd9899f](https://github.com/EOX-A/git-clerk/commit/fd9899fd3270aab94e75b6db5510442eb038befc))
* Added nav button with automation ([5f110cd](https://github.com/EOX-A/git-clerk/commit/5f110cd29a267a340180c37ef35bff10f3609153))
* Added pagination, snackbar, delete feature and api for delete ([e6f8321](https://github.com/EOX-A/git-clerk/commit/e6f83219f3173efc41bb37d4b271174661770097))
* Added schema through schema map ([c846e7b](https://github.com/EOX-A/git-clerk/commit/c846e7b554c94550e2b9dc406d35b9fae4d61d18))
* Added schema through schema map ([b8bebd3](https://github.com/EOX-A/git-clerk/commit/b8bebd36a1904f11f6d30a18ce6eea844ad7ade5))
* Added session tab, action buttons, clubbed similar code from session list and file list ([48ca360](https://github.com/EOX-A/git-clerk/commit/48ca360c3c30d6fd09d7aaf2f04ec8b04ba5df8e))
* Added upload image and video to editor ([b8cd39b](https://github.com/EOX-A/git-clerk/commit/b8cd39b27ae4efbe0a920939680ab9beb97e9ee6))
* Added upload multiple files ([392cc87](https://github.com/EOX-A/git-clerk/commit/392cc87e072d3a038983142320423d1fcc884f6a))
* Added username chip ([6f3a7f1](https://github.com/EOX-A/git-clerk/commit/6f3a7f1ca9ca713df994681371a3cf9d5b17b8f7))
* Added validation check before req, session pr status in file list page, disable file opne url and add file when pr is closed ([ebfb685](https://github.com/EOX-A/git-clerk/commit/ebfb6857a327176581ed26b0e54fe90e1f9cbfa8))
* Added validation check status ([8595b0e](https://github.com/EOX-A/git-clerk/commit/8595b0e9e40c1adc2bd3e4dfd3ef5749eaf40f8e))
* Added vuetify config and basic navigation ([f3878c4](https://github.com/EOX-A/git-clerk/commit/f3878c4fb2160ea0cbe269f7fa2a7b426d115d4c))
* Automation UI based on automation steps ([f7e2f33](https://github.com/EOX-A/git-clerk/commit/f7e2f33e7e63d5fd6a9f1c3702388bce7e25ec53))
* Delete file feature added to files list ([64ce5e5](https://github.com/EOX-A/git-clerk/commit/64ce5e51001bdd5323734ceb6eceb4d609add29d))
* Get file structure from octokit ([b130518](https://github.com/EOX-A/git-clerk/commit/b130518cd9536879cec33343d5685f452c76d940))
* Implemented all the feature for preview ([b1e9d12](https://github.com/EOX-A/git-clerk/commit/b1e9d12e8ae80e0c2683fb11bbea7343ae83a1f1))
* Improved json-form validator for all the type, combiner, conditional logic, properties and items ([ffa2009](https://github.com/EOX-A/git-clerk/commit/ffa20090df7cb6911c51d17158efe70097c3c5ba))
* Initial setup ([eb7d892](https://github.com/EOX-A/git-clerk/commit/eb7d8922ec95a10f22e5a8bb2453cbe76e0f353d))
* Made session's list dynamic using Github URL ([b671d30](https://github.com/EOX-A/git-clerk/commit/b671d30691ebb35c84fc52a03614c70fa8c1fcbd))
* Main window ([20e8587](https://github.com/EOX-A/git-clerk/commit/20e8587ff553a39ec58a169827bc3930bee56bac))
* Mobile view for action ([32f0676](https://github.com/EOX-A/git-clerk/commit/32f0676d4f64a3a6203bb2cbdfdd4d051ede6b5a))
* Navigation UI ([ca87353](https://github.com/EOX-A/git-clerk/commit/ca87353cf74436a9d95bd73a833b0cd21bdf439d))
* Progress-bar and commit for first pr ([00cfc85](https://github.com/EOX-A/git-clerk/commit/00cfc85e6ab3aa3664b1bb87ba55d6818466bb34))
* Request review feature added ([93e7810](https://github.com/EOX-A/git-clerk/commit/93e78102ed505737d2c19cacca396e7b57337ab0))
* Schema update add default to all json-form schema ([98f581b](https://github.com/EOX-A/git-clerk/commit/98f581be54bc57feff447fcb73e558a23c5f6ef6))
* Split similar code in session list and file change list, added file change diff scale ([26402db](https://github.com/EOX-A/git-clerk/commit/26402dba8c3d6d8b60cb2c2ce1d042eab5f2a4ba))


### Bug Fixes

* Added path for both /storytelling and /narattives for schemaMap ([9ca22fc](https://github.com/EOX-A/git-clerk/commit/9ca22fc0811a1b8d49433b56de9bdb1590843d70))
* Build issue ([8293613](https://github.com/EOX-A/git-clerk/commit/829361381cc54bdac39772d27a740b6bec59489b))
* Collapse expanded header in which content is present in json form ([d2ec432](https://github.com/EOX-A/git-clerk/commit/d2ec4327aee5ea51b0f9497dce9312ffd999c9c3))
* Compare oldContent with newContent ([d2bf41f](https://github.com/EOX-A/git-clerk/commit/d2bf41ff5da2df51e8b5fe038c7117891b557e4d))
* Display none property on label ([f96fa2b](https://github.com/EOX-A/git-clerk/commit/f96fa2bea4da2de0881ddd9b3555bca22c204438))
* Error passing wrong prop ([8ff3da7](https://github.com/EOX-A/git-clerk/commit/8ff3da75ded163f20a3e64b9d635b622894db0ba))
* Fiel url through commit sha ([e5e1a4f](https://github.com/EOX-A/git-clerk/commit/e5e1a4ffc88e70aa9231c8e82698ce38d894f550))
* Justify center of suggestionlist ([fe5bd03](https://github.com/EOX-A/git-clerk/commit/fe5bd036db54d608b254593bbf655a8a95b2061a))
* Logic for paste in create file input improved ([412210c](https://github.com/EOX-A/git-clerk/commit/412210c575d647b02e86a2373cf1c2254a7fd66d))
* Make repo owner part of githubRepo config and make authToken fetch as promise from async ([f1dd211](https://github.com/EOX-A/git-clerk/commit/f1dd211b22206d37d2849bdfb2525981d94fd349))
* Open existing file with add button ([25c8c17](https://github.com/EOX-A/git-clerk/commit/25c8c173ebd5a09fdd214d3c472b8f6dae5a2381))
* Reduced reduntant code ([9c644ea](https://github.com/EOX-A/git-clerk/commit/9c644eab4c3e43a11fc0fa1deab25483d03bcc7b))
* Remove async ([212043b](https://github.com/EOX-A/git-clerk/commit/212043b0a458993ca073a4e6dff8a21c71a9465e))
* Removed modal from create file and removed textarea from create file ([4ae403b](https://github.com/EOX-A/git-clerk/commit/4ae403b7ede216fb69d823d37572811a2e1ade59))
* Snackbar warning ([8f5b281](https://github.com/EOX-A/git-clerk/commit/8f5b28130788b3273ba29a037da043a9a4a60f82))
* **style:** Minor adjustments ([d4ad9d9](https://github.com/EOX-A/git-clerk/commit/d4ad9d974ff1a0b5e33bf4c45c65d210b1148133))
* **style:** Prevent unnecessary scrollbar ([d24adb0](https://github.com/EOX-A/git-clerk/commit/d24adb0332e37e47de83016c9732d8d70b9efe39))
* Styling eox-jsonform and dialog box ([67b3521](https://github.com/EOX-A/git-clerk/commit/67b35216f460c8777a7302b9980ce52dc1849b79))
* Ui update add button ([9a9e634](https://github.com/EOX-A/git-clerk/commit/9a9e6341223392f6fccdec2e72a252ef97ed0b6b))
* Undefined jsonforminstance ([d037c88](https://github.com/EOX-A/git-clerk/commit/d037c88afe836db75553692bd27e001399d9d9d5))
* Updated empty state with new items, added button to create session, preview button commented out ([2e20b1e](https://github.com/EOX-A/git-clerk/commit/2e20b1e9d86c3dd146f6060506c4c767e613395e))
* Wrong currPath in dir structure API ([9f733f4](https://github.com/EOX-A/git-clerk/commit/9f733f40232b033b8ad354fa6a68681fdbf7e6ca))
