export const GATE_CATEGORY = "__gate__";
export const ENTRY_GATE_TYPE = "__gate_entry__";
export const EXIT_GATE_TYPE = "__gate_exit__";
export const RETURN_GATE_TYPE = "__gate_return__";

export const VARIABLE_CATEGORY = "__variable__";
export const GETTER_VARIABLE_TYPE = "__variable_getter__";

export const START_EVENT_TYPE = "__start_event__";

export const SPECIAL_CATEGORY = "__special__";
export const PERSISTENT_COLLECTION_TYPE = "__persistent_collection__";
export const SELECT_INDEX_TYPE = "__select_index__";

export const CONSOLE_LOG = "console-log";

export const RESERVED_NODE_CATEGORIES = [GATE_CATEGORY, SPECIAL_CATEGORY, VARIABLE_CATEGORY] as const;
export const RESERVED_NODE_TYPE = [
    EXIT_GATE_TYPE,
    ENTRY_GATE_TYPE,
    GETTER_VARIABLE_TYPE,
    PERSISTENT_COLLECTION_TYPE,
    RETURN_GATE_TYPE,
    SELECT_INDEX_TYPE,
    START_EVENT_TYPE,
] as const;
