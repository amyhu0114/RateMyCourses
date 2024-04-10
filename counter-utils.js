async function incrCounter(counterCollection, collectionName) {
    // this will update the document and return the document after the update
    let result = await counterCollection.findOneAndUpdate({collection: collectionName},
                                                            {$inc: {counter: 1}}, 
                                                            {returnDocument: "after"});
    return result.counter;
}

async function resetCounter(counterCollection, collectionName, numResetTo) {
    let result = await counterCollection.findOneAndUpdate({collection: collectionName},
                                                            {$set: {counter: numResetTo}}, 
                                                            {returnDocument: "after"});
    return result.counter;
}

module.exports = {
    incrCounter, resetCounter
};