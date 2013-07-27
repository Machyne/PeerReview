var client = new ot.Client(0);
var isMyTurn = false;
var cycleOperation = null;

var getWholeText = function(doc) {
    return doc.getValue();
}

this.lineLength = function(doc, row) {
    return doc.getLine(row).length;
};
this.colRowPosition = function(doc, stringPosition) {
    var row = 0;
    while (stringPosition > lineLength(doc, row)) {
        stringPosition -= lineLength(doc, row);
        row++;
    }
    return {row: row, column: stringPosition};
};

var transformInsert = function(doc, stringPosition, text) {
    var position = colRowPosition(doc, stringPosition);
    doc.insert(position, text);
};
var transformRemove = function(doc, stringPosition, length) {
    var start = colRowPosition(doc, stringPosition);
    var end = colRowPosition(doc, stringPosition + length);
    doc.remove2({a0:start.column, a1:start.row, a2:end.column, a3:end.row, isFake:true});
};


// Called when text is inserted in Ace
var peerReviewInsert = function(position, text, totalLength) {
	var singleOperation = new ot.TextOperation()
		.retain(position)
		.insert(text)
		.retain(totalLength - position);
	if (cycleOperation == null) {
		cycleOperation = singleOperation;
	} else {
		cycleOperation = cycleOperation.compose(singleOperation);
	}
};



// Called when text is removed in Ace
var peerReviewRemove = function(start, end, totalLength, doc) {
	var singleOperation = new ot.TextOperation()
		.retain(start)
		.delete(end - start)
		.retain(totalLength - end);
	if (cycleOperation == null) {
		cycleOperation = singleOperation;
	} else {
		cycleOperation = cycleOperation.compose(singleOperation);
	}
};

// Called when the timer runs out and its the neighbor
// peer's role to run the transform function
var timeForMyNeighborToTransform = function() {
	// Send operation 'A' to this peer's neighbor
	var operationA = cycleOperation;
	send({op: !operationA? null : operationA.toJSON()});
};

var onReceiveOperationFromNonTransformer = function(doc, operationAJSON, fn) {
	var operationA = !operationAJSON? null : ot.TextOperation.fromJSON(operationAJSON);
	// Transform on operations 'A' and 'B'
	var operationB = cycleOperation;
	var operationAPrime, operationBPrime;
	if (!operationA || !operationB) {
		operationAPrime = operationA;
		operationBPrime = operationB;
	} else {
		var transformedPair = ot.TextOperation.transform(operationA, operationB);
		operationAPrime = transformedPair[0];
		operationBPrime = transformedPair[1];
	}
	// Send operation 'B prime' to neighbor
	send({op: !operationBPrime? null : operationBPrime.toJSON()});
	// Apply operation 'A prime' to the text
	applyOps(doc, operationAPrime, fn);
};

var onReceiveOperationFromTransformer = function(doc, operationBJSON, fn) {
	if (!operationBJSON){
		cycleOperation = null;
		fn();
		return;	
	}
	applyOps(doc, ot.TextOperation.fromJSON(operationBJSON), fn);
}

var applyOps = function(doc, operation, fn) {
	cycleOperation = null;
	// doc.setReadOnly(false);
	var wholeText = getWholeText(doc);
	fn();
	if (!operation) return wholeText;
	var newText = operation.apply(wholeText);
	doc.setValue(newText);
};

function clearOTTracking(){
	cycleOperation = null;
}
