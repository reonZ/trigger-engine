import { ActorPF2e, ActorUUID, DatabaseCreateOperation, ItemSourcePF2e, R } from "foundry-helpers";

async function processCreateTargetsEmbeddedItem(actors: ActorPF2e[], source: PreCreate<ItemSourcePF2e>) {
    let i = 3;

    const operations = R.map(actors, (actor): DatabaseCreateOperation<ActorPF2e> => {
        return {
            action: "create",
            data: [foundry.utils.deepClone(source)],
            documentName: "Item",
            parent: actor,
        };
    });

    while (i) {
        try {
            await foundry.documents.modifyBatch(operations);
            return;
        } catch {
            i--;
        }
    }
}

type CreateItemQueryOptions = {
    _type: "create-item";
    source: PreCreate<ItemSourcePF2e>;
    actors: ActorUUID[];
};

export { processCreateTargetsEmbeddedItem };
export type { CreateItemQueryOptions };
