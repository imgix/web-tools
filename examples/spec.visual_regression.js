describe('An example test:', function() {
  var browserWidths = [320, 640, 1024],
      screenshots;

  beforeAll(function(done) {
    browser.checkRendering(
      // The first argument is an identifier, used to name the directory into which these screenshots will be saved.
      // This should probably match the name of this test-suite, just for sanity.
      'example_test',

      // The second argument is a list of selectors for elements that should be screenshotted.
      // The name provided for each will be used in the screenshot's filename
      [
          {   name: 'element1',
              selector: '#selector1'
            },
          {   name: 'element2',
              selector: '#selector2'
            }
        ],

      // The third argument is a list of browser widths to use when taking these screenshots
      [320, 640, 1024]
    ).then(function(results) {
      screenshots = results;
    }).then(done);
  });

  // It's recommended to define one test comparing each element in the set
  describe('Element 1', function() {
    it('renders correctly', function() {
      expect(screenshots['element1']).not.toBeUndefined();
      // The .allPassed property will be set to `true` if the screenshots matched for each viewport width
      expect(screenshots['element1'].allPassed).toEqual(true);
    });
  });

  describe('Element 2', function() {
    it('renders correctly', function() {
      expect(screenshots['element2']).not.toBeUndefined();
      expect(screenshots['element2'].allPassed).toEqual(true);
    });
  });
});
