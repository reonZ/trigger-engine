# 1.32.0

- fix applications not enabling triggers that were previously saved with no nodes in their data
  - this was only an issue while working on the triggers, a page reload would have solved the issue so there is no persisting problem
- `pf2e-trigger`:
  - `Action Send to Chat`:
    - rename the default title to `Action Used`
    - if the `All Actionable` feature of the `PF2e Toolbelt` is enabled, the event will only trigger on actual `Use` (you need toolbelt version `3.56.0` for that)
    - the title of the node changes if you have the `All Actionable` enabled or not in your world
  - add `DC` output to the `Check Rolled` event
  - add new `Spell Cast` event
    - it only triggers when actually casting a spell (not send-to-chat)
    - if the spell has variants, it will only trigger after a variant has been selected instead of on message creation
    - to take advantage of this event, you need a pf2e/sf2e systems version newer than `8.4.1`/`1.4.1`

# 1.31.1

- fix connections to `Return Gate` inputs visually disappearing

# 1.31.0

- add new `Specials` node category which represent nodes that require some extra hardcoded work from the module (not unlike `Gate` & `Variable` nodes )
- add new `Persistent Collection` special node
  - it allows you to place a persistent array of a certain type in your trigger to which you can add new entries at any moment
  - its creation was in response to the latest update adding a way to create items in bundle making it impossible to filter targets using actual nodes
- fix nodes menu showing invalid nodes when dragging a `text` output on the board
  - this was due to the some select fields matching even though they don't have a connector (i.e. the `Compare ...` logic nodes)
- `Execute Trigger`:
  - actually propagate the current user context to the next trigger (work was done but data wasn't forwarded...)
  - now propagate the current scene context to the next trigger

# 1.30.0

- add extra localization path to node aliases as well as always try to localize provided aliases
- add aliases to all nodes that have alternate titles
  - allowing you to use those alternate titles to search nodes in the nodes menu (e.g. `Loop Over Targets` & `Find Target` for the `Filter Targets` extractor node)
- fix a bunch of localization typos/mistakes
- `pf2e-trigger`:
  - add `item->text` convertor, it recovers the item's sourceId (not its uuid)
  - convert all nodes that create items (e.g. `Create Item`, `Create Trigger-Effect`, etc.) to accept an array of targets
    - this avoids the need to loop over multiple targets to create the same item
    - it internally uses a bundled server query making it way faster than looping (the more target the faster it is)
  - fix `Has Trigger-Effect` always returning false when not using an explicit `identifier`

# 1.29.0

- add new background image to the blueprint canvas and a way to register you own for your application
- fix setting back input values to their default value not being registered in the triggers preparation diff check

# 1.28.0

- you can now review `invalid` triggers
- you can now duplicate `invalid` triggers
  - the module will get rid of all the invalid nodes/connections before creating the duplicate
- `Execute Trigger`:
  - now propagate the current user context to the next trigger

# 1.27.0

- `Entry Gate` is no longer a dead end, it will now execute the next node connected to the newly added `Out` bridge as soon as the gate is fully executed
- add new `Return Gate` gate node
  - the option to create a return gate can be found in the context menu of an `Exit Gate`
  - you can have multiple instances of the `Return Gate`
  - you can add custom inputs to them which will be mirrored and returned to the original calling `Entry Gate` (as outputs)
- now cache all value nodes the first time they are queried
  - this mean that you are gonna have to use a new node if you want the module to query again
  - rename all value nodes that didn't include the `Cached` prefix
- add new `Cached Number` value node
- add new `Cached Text` value node (with the 3 usual states)
- add new `Execute Trigger` action node
  - it is the equivalent of using the `game.trigger.execute` command
  - it calls the `Execute Event` node in the trigger of `path`
  - the module will prevent you to call "self" but can't prevent multi calls back to "self" so beware infinite loop
- add an `After Loop` out bridge to the `Await Delay`, `Is Inside Aura`, `Is Inside Region`, `Filter Targets` and `Find Item Instances` nodes
- BREAKING: remove the `Execute Once` input from the `Is Inside Aura` and `Is Inside Region` nodes
  - to reproduce, you need to add a `Break Current Process` node at the end of the `out` chain
- no longer display the node's tooltip when hovering its header
  - a special icon is added instead for that purpose
  - this has the benefit of avoiding some annoying flickering of tooltip
  - it is also making it clear to the user that there is something of note for that node
- `Await Delay`
  - fix `repeat` state not fully resolving
  - fix missing states localization
- fix custom input `point` connections not displaying label tooltips
- fix enriched text popup's menu going out of bounds with the v14 changes

# 1.26.0

- now generate a generic triggers application to be used in the current system
  - the application includes all the system agnostic's hooks, nodes, entries and convertors
  - the application will only show up if no other application (non including trigger-animations) is registered in your world

# 1.25.1

- fix the `Localization` state of the `Format Text` logic node not using the moustache (`{variable}`) format and still using the `@variable` like the other states

# 1.25.0

- add new `Toggle all triggers` button to triggers folder headers
- fix some nonsense during the triggers preparation that caused a volley of small bugs here and there
- fix not being able to input numbers in the `point` fields

# 1.24.0

- this release comes with even more performance boosts (don't close your eyes or you are gonna miss it!)
  - thanks to [fotoply](https://github.com/fotoply) once again for all the diagnostics
  - more work has been done to further improve preparation time which also speeds up the opening of the blueprint app for world that have a lot of triggers
  - add `culling` to the blueprint application to improve rendering performances for triggers that have an inconsiderate amount of nodes and connections
- fix not being able to use `Copy Node` and `Duplicate Node` context menu options

# 1.23.0

- this release comes with a huge refactor of the module's preparation logic to significantly improve performances on worlds that have a lot of triggers
  - thanks to [Vauxs](https://github.com/MrVauxs) and [fotoply](https://github.com/fotoply) for guiding me into isolating the parts of the code that were at fault as well as offering directions to solve them
  - to give an extreme example, with a world using `Trigger Animation Trove (PF2e / SF2e)` with all triggers enabled (166 at the time of testings), we went from ~7000ms to less than 1ms for a `save + preparation + render of the app` process
  - note that there was no issue with the triggers running in your worlds, it was just about preparation and the blueprint menu
- fix `__start_event__` missing from forbidden node types
- fix some triggers being shown as `invalid` for reasons that should not completely disqualify them
  - the issues are resolved in the data instead of branding the triggers as completely `invalid`
- fix lock icon for `invalid` triggers not being aligned with other lock icons
- fix `TriggerApplication.prepareApplications` not being awaited before calling the `triggerEngine.ready` hook

# 1.22.1

- add new `triggerEngine.ready` hook which is called once all applications are ready

# 1.22.0

- rename `Scene Targets` value node into `Scene Tokens` to avoid confusion
- now allow nodes to have tooltips when hovering their header
- add new `Get User Targets` action node
  - retrieve the current targets for the provided user (or the current trigger user context)
  - the `Only Target` state will return a `target` when only one exist

# 1.21.0

- now allow `out` bridge connections to have tooltips
- now save the stretched state of the triggers menu (it is now a user setting)
  - also change the contrast of the stretch handler when the background is fully dark
- add new `Item Removed from Actor` event node
- fix scrollable elements in the triggers menu not retaining their position on refresh
- fix triggers menu not being refreshed when using `Blueprint#addTrigger` without setting the new trigger as current
- fix `Item Added to Actor` without a `type` input not being triggered
- `pf2e-trigger`:
  - add an `After Loop` out bridge to the `Find Item Instances` extractor node

# 1.20.0

- change icon for the `Await Confirmation` action node
- add `canStop` getter to `TriggerNode` indicating that the node may not call the next one
- add `User Context` input to the `Execute Animation` action node
- add new `Await User Input` action node
  - the node will send an input request to a specific user
  - the node has two states for `text` or `number` input
  - the `title`, `label` and `placeholder` inputs can be localization keys
- add new `Await Selection` action node
  - the node will send to a specific user a list of options to select from
  - the `List` state accepts a `text` list of `value:Label` (or just `value`)
  - the `Json` state must be an array of `{value: string; label?: string}`
  - the `title` input can be a localization key
- add new `Vitality Network` example trigger in the source files
- fix `number` input having a default `step` value
- fix missing output localization for the `Text List` value node

# 1.19.0

- add `Console Log` option in the nodes context-menu
  - only shows up if a single node with output entries is selected
  - will automatically create a new `Console Log` action node next to the selected one
  - automatically generates all the custom inputs on the new node to match the outputs of the selected one
  - automatically connect all the outputs to the new node (won't override existing `Out` connection)

# 1.18.1

- `pf2e-trigger`:
  - fix `Damage Taken` event not triggering for damage that originate from an action

# 1.18.0

- add `Different from` option to all `Compare ...` logic nodes
- fix custom input fallback label not using the entry type when appropriate even though the placeholder says it will
- `pf2e-trigger`:
  - add new `rank` connection type (labeled `Proficiency`)
    - it represents a system profiency rank value (0~4)
    - it can be converted to and from a `number` entry directly
  - add new `Compare Proficiencies` logic node
  - add new `Split Proficiency` splitter node
  - add `Maximum` output to the `Has Special Resource` condition node

# 1.17.0

- `Execute Animation`:
  - convert the `any` inputs into `target`
- `Update Item`:
  - add a second state to allow updating arrays as the module always convert arrays into non-arrays for non-array entries
- fix issue with some websocket helper functions
- fix imported triggers not triggering the "Require Saving" feature

# 1.16.0

- remove some lingering debug logs
- add new `aliases` static getter in `TriggerNode`
  - they are being used in conjunction with the node's name when using the search field in the nodes menu
  - any alias matching the search input will appear just below the node entry in the menu
- move the module's `RegionBehaviorType` registration to the `ready` hook to (hopefully) fix a localization issue with some systems

# 1.15.0

- now return an object when an application is registered
  - currently only contains the `prepareTriggers` function
- custom setting applications can now specify if their menu is restricted or not
- make the custom setting `afterPrepared` function asynchronous
- you can now click on the folder's name to expand/collapse its content
- the module has received some refactor to accommodate multi-user editing
  - the blueprint menu is refreshed live when another user saved data
  - any trigger that has been modified on your client since the last time you saved will remain intact on refresh
    - modified triggers waiting to be saved are decorated with a disk icon in the triggers menu and will remain visible even if their parent folder is collapsed
    - this means that if another user were to update/delete your trigger while you are working on it, it would remain intact for you until the next time you save your triggers
- add `Save Triggers` button to the main blueprint menu tab
  - it will be clickable if there are at least one modified trigger waiting to be saved or if you have deleted any trigger
- rename the `Close Window` window button into `Exit Application` and only show the "save triggers before closing" popup if saving is possible

# 1.14.0

- fix `setting` applications using custom logic not being able to open the blueprint menu
- `pf2e-trigger`:
  - add `Include Origin` input to `Aura Entered`, `Aura Left` and `Is Inside Aura` nodes
    - if checked, the node will also trigger on the aura's origin actor/token
    - it is unchecked by default so everything already existing will behave as before the change
  - add `Effect` output to the `Create Effect` action node (also changed the target input position)
  - add new `Create Effect From Source` action node
    - it allows you to use a compendium/world effect source and tweak a few of its data before adding it to the `target`

# 1.13.0

- add new `region -> target` convertor which returns the `tokens` currently inside the region
- add new `Extract From Region` extractor node
- `Execute Animation`:
  - fix missing `region` type in custom inputs selection

# 1.12.0

- add warning when trying to open the blueprint menu before module triggers have finished to be parsed
- add new `region` connection type which represents a `RegionDocument`:
  - had too many region related nodes to continue avoiding it
  - every previously `any` entries that were representing a region have been converted to `region`
  - all existing connections will remain, only the type changes
  - for obvious reason, custom entry could not be converted and should be done manually (though everything should still work as `any` can be converted to and from every other type)
- add new `Await Delay` action node:
  - it also has a `Repeat With Delay` state
- add new `Is Inside Region` condition node:
  - it tests if the provided token is inside a region that has the same name
  - if more than one such region is found, it will loop over each of them (unless the `Execute Once` is checked)
- add new `Item Added to Actor` event node:
  - you can (optional) provide a comma separated list of item types to check against
- add new `On Hook Called` event node:
  - this will automatically register a foundry hook of the same name
  - it is on the user to set the custom outputs matching the hook arguments in the same order
- `Execute Animation`:
  - convert both `Sources` and `Targets` inputs into `any` type
- now automatically creates a node when pressing `Enter` in the search field of the nodes menu if only one node remains in the list
- `pf2e-trigger`:
  - add new `Is Inside Template` condition node which works exactly like the `Is Inside Region` node but instead uses the origin item slug to identify the regions

# 1.11.0

- add a second `prepareTriggers` parameter to the `setting.set` callback of application registration
  - this callback MUST be called everytime the `setting.set` callback is called by the module
  - you should call it after you have fully saved the provided data
- add extra `afterPrepared` callback in the `setting` object of application registration
  - it is called after your application triggers have been fully prepared
  - it has a single `data` argument that is a copy of the processed sources of all the validated/cached triggers
- add a bunch of new methods to the `TriggerNode` and `TriggerHook` classes
- add new `Execute Animation` action node
  - this node is used to execute an animation trigger from the coming `Trigger Animations` module (it won't do anything for now)
  - if the `Trigger Animations` module is active in your world when the node is reached, the animation will be executed

# 1.10.1

- add the `If` tag to `Split Boolean` & `Test If Truthy` nodes
- fix not being able to use the `-` character in entries `key`
- fix closing a context menu creating infinite loop of close calls
- fix opening a context menu next to the bottom edge force-closing it right away

# 1.10.0

- application can now implement their own settings `get` and `set` logic
  - if used, the module will not register a foundry world setting for the application
- add the lists of builtin keys as second parameter of the `triggerEngine.registerApplication` hook call
  - this should make it easier for application devs to set which builtin features they want to add
- add new `TriggerNode#getContext` and `TriggerNode#setContext` methods
  - they get and set custom data that live across the whole trigger instance
- add new `point` connection type representing a `{x: number; y: number}` struct
- now autofocus the `Node Name` search field when opening the nodes menu
- `Attach Scene Region`:
  - now also updates the emanation center sizes to fit the token it is attaching to for `emanation` region shapes
- `Move Scene Region`:
  - remove the `X` and `Y` inputs and replace them with a single `point` input
  - this means that any pre-existing node will have to be updated
- `pf2e-trigger`:
  - add `Level` input to the `Create Effect` node
  - add `Level` input to the `Create Item` node to override it if possible (leave to `0` to not override)

# 1.9.0

- split the `Create Region Behavior` between builtins and the `pf2e-trigger` application
  - the `Difficult Terrain` state being reserved to the `pf2e-trigger` application
  - remove the `Events` inputs from the `Source Code` state, you are expected to provide them directly in the `System Source` if needed
- add `Region Document` output to the `Region Triggered` event node
- add `Attach Scene Region` action node
  - it attach the region to the provided target token and will follow it while moving
  - the `Center to Token` option will also move the first shape of the region to have its origin be the same as the attached token
  - if the `Token` input of the `Detach Region` state is provided, the region will only detach if the current attached token is matching
- add `Move Scene Region` action node
  - move the first shape of the provided region to the coordinates or token position

# 1.8.0

- rename `Scene Region` event node into `Region Triggered`
  - also replaced its icon
  - the node now also includes the attachment `target` if the region is attached to a token on your scene
- improve handling of invalid triggers
  - users won't be able to interact with them anymore
  - their data will remain as is when saving your triggers instead of being processed and cleaned by the module
  - this is mostly in anticipation for modules adding their own nodes to existing applications and nodes missing from triggers due to said modules being disabled
- now always display tooltips for `text` inputs
- add new `Text List` value node
  - a simple comma separated text field converted into a list
- the `Resolve Formula` logic node now also support `target` and `item` variables
  - you can then directly use full path such as `@actor.level` if your `target` input is `actor`
  - if the path doesn't lead to a number, the whole match will be replaced by `0`
- fix third party being able to override existing nodes when using the `triggerEngine.registerNodes` hook
- fix local data not overriding builtins when registering an application
- `pf2e-trigger`:
  - add new `Toggle RollOption` action node
  - add new `Find Item Instances` extractor node
    - it basically works like the `Has Item` nodes but will not stop looking after finding one instance of the matching item
  - implement an extended version of `Region Triggered` for pf2e
    - an extra `Origin`, `Item` and `Roll Options` outputs are added to it
    - the extra outputs are filled if the region was originally a system "template" (i.e. from a spell chat message)
    - `Origin` is the origin actor of the "template"
    - `Item` is the origin item of the "template"
    - `Roll Options` contains the list of roll options associated with the message
  - add new `Template Placed` event node
    - "template" refers to any scene region generated by the system (i.e. from a spell chat message)
    - the node has pretty much the same outputs as the `Region Triggered` node
    - the `Region Document` output contains the actual foundry document that triggered the
  - add new `Create Region Behavior` action node
    - it allows you to add new bahavior on an already existing region with currently 3 states
    - a generic `Source Code` state to manually set the data
    - the `Trigger Event` state which directly creates the `Trigger Engine` behavior, you can leave the `path` field empty to point to the trigger itself
    - the `Difficult Terrain` state which directly creates a bahavior of the same name

# 1.7.1

- fix inputs and out-bridge connections not being cleared from the data when swapping a node state
  - only the connections that belong to the previous state are cleared
  - this shouldn't have had any impact on the way things work, but it is preferable if they are removed
- `pf2e-trigger`:
  - fix check messages originating from an `Action` being considered as action messages, triggering wrongly the `Action Sent to Chat` event and not triggering the `Check Rolled` event

# 1.7.0

- add a new module hook to register extra nodes for an existing application
- add `boolean -> number` auto-convertor (true=1; false=0)
- all condition nodes now have two states
  - `Split` which is the same as before
  - `Boolean` which only has a single `Out` bridge connection and an extra `Boolean` output representing the result
- fix drag selection sticking on the canvas when using `[Right-Click]` while dragging
  - the selection will now disappear whenever you click again on the canvas
- `pf2e-trigger`:
  - add new `Everything` state to `Damage Taken` event node
    - it triggers for everything and allows you to check yourself what type of event it was later in the trigger
  - add `Update Initiative` action node with convenient `Before/After Combatant` states
  - add `Value` output to `Has Condition` representing the highest existing value of the found conditions
  - **BREAKING CHANGE:** the `Has Item` condition node has been split into two distinct nodes (due to condition nodes now always having two states)
    - `Has Item with Source UUID` which is the same as before
    - `Has Item with Slug` which is now its own node instead of being a state for `Has Item`
    - all `Has Item` nodes that were using `Source UUID` will work as is, no change required
    - all `Has Item` nodes that were using `Slug` will have to be replaced sadly (your triggers will reach a blank node otherwise)
  - fix `Distance Between Tokens` output label localization

# 1.6.0

- this is a foundry version `14.360` release
- update to be compatible with the various v14 changes

# 1.5.1

- the `Scene Targets`, `Filter Targets` and `Execute Script` nodes will now log any error caused by the user provided function instead of catching it silently
  - the try/catch is for the entire node context, so any error will still break the entire node's process
- `pf2e-trigger`:
  - fix `Extra Note` localization typo in the `Roll Data` section of the `Roll Damage` and `Roll Save` nodes

# 1.5.0

- `pf2e-trigger`:
  - add `Action Sent to Chat` event node:
    - it will trigger whenever an action message is created regardless of how (there is no way to identify otherwise)
    - if the `Action Slug` remains empty, the event will trigger for any action
    - the `Targets` output is only ever related to the `PF2e Toolbelt` module as action messages normally don't have a target
  - add `Remove Condition` action node:
    - it will remove every non-locked instances of the condition from the actor

# 1.4.2

- `Extract from Actor/Item`:
  - fix `path` field for the custom outputs not being localized
- `pf2e-trigger`:
  - `Decrease Condition`:
    - fix the condition value being raised to the `min` input if the actor already had the condition at a lower value

# 1.4.1

- `pf2e-trigger`:
  - `Roll Damage`:
    - fix dc value not always being forwarded to the message flags

# 1.4.0

- fix the `Create/Edit Trigger` dialog width
- `pf2e-trigger`:
  - `Increase Condition`:
    - fix mishandling of increment value
  - `Move Time`:
    - add new `Threshold` state allowing you to move time up to a defined system threshold (dusk, down, etc.)
    - fix node missing icon

# 1.3.0

- `pf2e-trigger`:
  - add `Is Reroll` boolean output to the `Attack Rolled` and `Check Rolled` event nodes
  - add `Has Special Resource` condition node
    - the resource must also have a `max` value greater than `0`
      - this is useful for mythic characters as `hero-points` always exists in the data
    - it returns the current value as an output (default `-1`)
  - add `Move Time` action node to update the system world clock
  - rename `Update Resource` into `Update Special Resource`

# 1.2.0

- move the `Filter Targets` node to the `Extrator` category
- fix not being able to enable third-party triggers if no copy exist in your world
- `pf2e-trigger`:
  - add new `Extract Item Formula` node
    - you can extract formula from a compendium/world item as well
  - move the `Get ChoiceSet Selection` node to the `Extractor` category
  - move the `Get RollOption Value` node to the `Extractor` category

# 1.1.0

- the `text -> number` now returns `-1` as default value instead of `0`
- add new `Refresh Application` button next to the `Save Triggers` in the trigger menu
  - this completely closes and re-open the menu and re-select the current trigger
  - it offers you to save your triggers before the refresh, otherwise, any un-saved change will be lost
- `pf2e-trigger`:
  - add new `Update Effect Duration` action node
  - add new `Get RollOption Value` logic node
    - it returns the part after the provided prefix of a roll-option
    - e.g. you provide `kinetic-gate:first-element` and the returned value will be `fire-gate` if the roll-option is `kinetic-gate:first-element:fire-gate`
    - if you need it as a numerical value, the `text -> number` convertor will take care of it for you
  - fix `Increase Condition` reducing an existing badge value down to the `Maximum` input field
  - fix `Increase Effect Badge` not working in its `Item` state

# 1.0.2

- `pf2e-trigger`:
  - the `Compare Alliance` node no longer uses the system's `isAllyOf` and `isEnemeyOf` methods, it instead directly compare their alliance ; which means that comparing an actor with itself will now return `true` for `Are Allies`
  - image paths inputs are now doubled to support paths from both the pf2e & sf2e systems

# 1.0.1

- `pf2e-trigger`:
  - add a `Roller` target output to the `Check Roll` event node, the `Target` out put which was previously the roller of the check will now be the actual target of the message

# 1.0.0

- official foundry release
