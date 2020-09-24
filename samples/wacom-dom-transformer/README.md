# dom-transformer

## Description

The Javascript library performs DOM nodes transformations based on browser DOMMatrix API. Expose transform event and pinch event.

Register transform event with:

```javascript
	let transformer = TransformEvent.register(DOMNode, TransformOptions);

	DOMNode.addEventListener("transformstart", Function);
	DOMNode.addEventListener("transform", Function);
	DOMNode.addEventListener("transformend", Function);
```

Register pinch event with:

```javascript
	let pincher = PinchEvent.register(DOMNode, TransformOptions);

	DOMNode.addEventListener("pinchstart", Function);
	DOMNode.addEventListener("pinch", Function);
	DOMNode.addEventListener("pinchend", Function);
```

## TransformOptions

| name            | type               | default            | description                                                                                    |
| --------------- | ------------------ | -----------------: | ---------------------------------------------------------------------------------------------- |
| translate       | boolean            |                    | Activate translate transform                                                                   |
| rotate          | boolean            |                    | Activate rotate transform                                                                      |
| scale           | boolean            |                    | Activate scale transform                                                                       |
| minWidth        | int                | 50                 | Scale transform width limitation                                                               |
| minHeight       | int                | 50                 | Scale transform height limitation                                                              |
| keepRatio       | boolean            | false              | Scale transform allows skew by default                                                         |
| translateHandle | HTMLElement        | registered DOMNode | Translate controller, defaults to monitored element                                            |
| rotateHandles   | Array<HTMLElement> |                    | Rotation controllers                                                                           |
| delta           | boolean            |                    | Delta transform also exist in event detail, by defaults only accumulated transform is reported |
| origin          | boolean            |                    | Transform is reported in view coordinate system, if oirgin transform is needed set this flag   |
