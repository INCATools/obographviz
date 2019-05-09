OBO = http://purl.obolibrary.org/obo

onts/%.owl:
	curl -L -s $(OBO)/$@ > $@.tmp && mv $@.tmp $@


$(FOO)-x-$(BAR).json:
	echo $(FOO) xxx $(BAR)

$(ONT)-ancs-$(NODE).json: onts/$(ONT).owl
	robot filter -i $< --term $(NODE) --select "annotations ontology ancestors" -o $@

$(ONT)-ancs-$(NODE).owl: onts/$(ONT).owl
	robot filter -i $< --term $(NODE) --select "annotations ontology ancestors" -o $@

onts/%.json: %.owl
	robot convert -i $< -o $@
