#notes
#might need to use Canny (or something else) to remove the background from the image
#and also to separate the variants away from the preview half of the image
import cv2 as cv
import numpy as np
import matplotlib.pyplot as plt
import sys
from pathlib import Path

def main():
    #print(img_filename)
    img_filename = None
    for f in ss_files:
        if f.name.endswith(',1.png'):
            img_filename = f.name
    if img_filename is None:
        print('Failed: Preview image file not found')
        return False
    img = cv.imread(str(ss_path / Path(img_filename)))   #you can read in images with opencv
    cos_type,keyname,_ = img_filename.split(',')
    #keyname = keyname
    
    #displayimg = cv.cvtColor(img.copy(), cv.COLOR_BGR2RGB)

    #replace the known cosmetic preview background with black cells to make it easier to detect edges
    img_addblack = img.copy()
    img_addblack[np.all(img_addblack == (171,110,38), axis = -1)] = (0,0,0)
    img_addblack[np.all(img_addblack == (202,132,50), axis = -1)] = (0,0,0)
    img_addblack[np.all(img_addblack == (149,96,28), axis = -1)] = (0,0,0)

    #set hsv range for generating a mask to get the preview or variants
    img_hsv = cv.cvtColor(img_addblack, cv.COLOR_BGR2HSV)

    #identify cosmetic rarity
    hsv_testranges = {
        "exclusive": {
            "color": "dark purple",
            "lower_hsv": np.asarray([143, 177, 127]),
            "upper_hsv": np.asarray([152, 250, 137])
            },
        "legendary": {
            "color": "yellow",
            "lower_hsv": np.asarray([16, 148, 235]),
            "upper_hsv": np.asarray([24, 183, 255])
            },
        "epic": {
            "color": "purple",
            "lower_hsv": np.asarray([141, 117, 220]),
            "upper_hsv": np.asarray([149, 130, 237])
            },
        "rare": {
            "color": "blue",
            "lower_hsv":  np.asarray([96, 191, 241]),
            "upper_hsv": np.asarray([100, 200, 255])
            },
        "uncommon": {
            "color": "green",
            "lower_hsv":  np.asarray([46, 98, 185]),
            "upper_hsv": np.asarray([57, 131, 203])
            },
        "common": {
            "color": "black",
            "lower_hsv":  np.asarray([102, 140, 99]),
            "upper_hsv": np.asarray([104, 163, 121])
            }
        }

    #checking pixels around 20,20
    cosmetic_rarity = ''
    test_segment = img_hsv[18:22,18:22]
    for rarity,info  in hsv_testranges.items():
        test_mask = cv.inRange(test_segment, info["lower_hsv"], info["upper_hsv"])
        _, thresh = cv.threshold(test_mask, 127, 255, 0)
        if thresh.sum() > 14:
            cosmetic_rarity = rarity
            
    if not cosmetic_rarity:
        print("Failed: Cosmetic rarity could not be identified")
        return False

    #apply mask for preview
    hsv_ranges = {
        "exclusive": {
            "color": "dark purple",
            "lower_hsv": np.asarray([102, 123, 127]),
            "upper_hsv": np.asarray([152, 247, 212])
            },
        "legendary": {
            "color": "yellow",
            "lower_hsv": np.asarray([14, 10, 150]),
            "upper_hsv": np.asarray([110, 200, 255])
            },
        "epic": {
            "color": "purple",
            "lower_hsv": np.asarray([104, 100, 50]),
            "upper_hsv": np.asarray([205, 197, 255])
            },
        "rare": {
            "color": "blue",
            "lower_hsv":  np.asarray([96, 196, 170]),
            "upper_hsv": np.asarray([105, 200, 255])
            },
        "uncommon": {
            "color": "green",
            "lower_hsv":  np.asarray([45, 80, 90]),
            "upper_hsv": np.asarray([110, 200, 255])
            },
        "common": {
            "color": "black",
            "lower_hsv":  np.asarray([101, 140, 99]),
            "upper_hsv": np.asarray([106, 203, 175])
            },
        }

    #generate mask for the identified rarity
    mask = cv.inRange(img_hsv, hsv_ranges[cosmetic_rarity]["lower_hsv"], hsv_ranges[cosmetic_rarity]["upper_hsv"])
    ret, thresh = cv.threshold(mask, 127, 255, 0)
    
    contours,_ = cv.findContours(thresh, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE)
    large_contours = []
    for contour in contours:
        #print(contour)
        (x,y,w,h) = cv.boundingRect(contour)
        #print(f'x={x}, y={y}, w={w}, h={h}')
        if ((w>20) and (h>20)):
            #print(f'x={x}, y={y}, w={w}, h={h}')
            #np.append(large_contours,[x,y,w,h])
            large_contours.append([x,y,w,h])
            #cv.rectangle(displayimg, (x,y), (x+w,y+h), (0,255,0), 2)

    large_contours = np.array(large_contours)
    minx = np.min(large_contours[:,0])
    miny = np.min(large_contours[:,1])

    #print(minx)
    #print(miny)

    #img_rgb = cv.cvtColor(img.copy(), cv.COLOR_BGR2RGB)
    #plt.imshow(displayimg)
    #plt.show()

    #crop preview
    if cos_type == 'back':
        preview = img[(miny):(miny+200), (minx+45):(minx+245)] #for back cosmetics- they are off-centre
    else:
        preview = img[(miny):(miny+200), (minx+25):(minx+225)]
    #preview = img[(miny):(miny+200), (minx+25):(minx+225)]
    #preview_rgb = cv.cvtColor(preview, cv.COLOR_BGR2RGB)
    #plt.imshow(preview_rgb)
    #plt.show()

    #cv.imwrite(str(crops_path / Path(img_filename[:-4] + '_preview.png')),preview)
    cv.imwrite(str(crops_path / Path(img_filename[:-6] + '.png')),preview)
    
    #variants
    var_count = 0
    varfile_count = 0
    for f in ss_files:
        img = cv.imread(str(ss_path / Path(f.name)))   #you can read in images with opencv
        #cos_type,keyname = img_filename.split(',')
        #keyname = keyname[:-4]
        
        #replace the known cosmetic preview background with black cells to make it easier to detect edges
        img_addblack = img.copy()
        img_addblack[np.all(img_addblack == (171,110,38), axis = -1)] = (0,0,0)
        img_addblack[np.all(img_addblack == (202,132,50), axis = -1)] = (0,0,0)
        img_addblack[np.any(img_addblack != (0,0,0), axis = -1)] = (255,255,255)
        
        """
        #set hsv range for generating a mask to get the preview or variants
        #img_hsv = cv.cvtColor(img_addblack, cv.COLOR_BGR2HSV)
        hsv_lower = np.asarray([104, 170, 200])
        hsv_upper = np.asarray([104, 200, 255])

        variants_mask = cv.inRange(img_hsv, hsv_lower, hsv_upper)
        #plt.imshow(variants_mask)
        #plt.show()

        _, v_thresh = cv.threshold(variants_mask, 127, 255, 0)
        #plt.imshow(v_thresh)
        #plt.show()
        """
        img_gray = cv.cvtColor(img_addblack, cv.COLOR_BGR2GRAY)
        _, v_thresh = cv.threshold(img_gray, 60, 255, cv.THRESH_BINARY_INV)
        
        v_contours,_ = cv.findContours(v_thresh, cv.RETR_LIST, cv.CHAIN_APPROX_NONE)
        #print(v_contours)
        variants_contours = []
        for contour in v_contours:
            #print(contour)
            (x,y,w,h) = cv.boundingRect(contour)
            #print(f'x={x}, y={y}, w={w}, h={h}')
            if ((w>380) and (h>120) and (w<395) and (h<135)):
                #print(f'x={x}, y={y}, w={w}, h={h}')
                #np.append(large_contours,[x,y,w,h])
                variants_contours.append([x,y,x+w,y+h])
                #cv.rectangle(displayimg, (x,y), (x+w,y+h), (0,255,0), 2)
        
        variants_contours.sort(key = lambda xy: (xy[0] + xy[1]))
        var_count += len(variants_contours)
        variants_contours = np.array(variants_contours)
        v_minx = np.min(variants_contours[:,0])
        v_miny = np.min(variants_contours[:,1])
        v_maxx = np.max(variants_contours[:,2])
        v_maxy = np.max(variants_contours[:,3])
        
        #yellow-highlighted box is slightly less wide, and the top left corner of this box is the reference point so it must be corrected
        if (variants_contours[0][0] != v_minx):
            variants_contours[0][0] = v_minx
        if variants_contours[0][1] != v_miny:
            variants_contours[0][1] = v_miny
        #if variants_contours[0][2] != v_minx:
        #    variants_contours[0][2] = v_minx
        #if variants_contours[0][3] != v_miny:
        #    variants_contours[0][3] = v_miny

        #print(v_minx)
        #print(v_miny)
        #print(v_maxx)
        #print(v_maxy)
        
        #if no variants, only default view is shown- it is 389 +/- 5 pixels wide
        #if variants, width is 802-805 +/- 5 pixels
        
        if (var_count > 1):
            varfile_count += 1
        
            variant_border_thickness = 5    #px
            #variant_gap = 25    #px
            img_width = (v_maxx - v_minx) if (v_maxx - v_minx) > 750 else 795 #px - seems to be 795
            img_height = v_maxy - v_miny    #px
            
            #bg_colour = np.empty((), dtype=object)  #from here: https://stackoverflow.com/questions/40709519/initialize-64-by-64-numpy-of-0-0-tuples-in-python
            #bg_colour[()] = (202, 132, 50)
            #img_canvas = np.full((img_height + 2*variant_border_thickness, img_width + 2*variant_border_thickness,3), bg_colour, dtype=object)
            img_canvas = np.zeros([img_height + 2*variant_border_thickness, img_width + 2*variant_border_thickness,3],dtype=np.uint8) #from: https://stackoverflow.com/questions/10465747/how-to-create-a-white-image-in-python
            img_canvas[:] = (202, 132, 50)
            
            crop_margin = 3
            #crop_top = v_miny - crop_margin
            #crop_bottom = v_maxy + crop_margin
            #crop_left = v_minx - crop_margin
            #crop_right = v_maxx + crop_margin

            for cont in variants_contours:
                imgtocrop = img.copy()
                img_canvas[(cont[1] - v_miny - crop_margin + variant_border_thickness):(cont[3] - v_miny + crop_margin + variant_border_thickness), (cont[0] - v_minx - crop_margin + variant_border_thickness):(cont[2] - v_minx + crop_margin + variant_border_thickness)] = imgtocrop[(cont[1] - crop_margin):(cont[3] + crop_margin), (cont[0] - crop_margin):(cont[2] + crop_margin)]
            
            #if (crop_right - crop_left === 802):    #for 1 row of variants, the contour seems to be too close to the left of the left (yellow-highlighted) variant
            #    crop_left -= 3
            
            #if (crop_right - crop_left < 750):
                #crop_right = 
            #if ((v_maxx - v_minx > 750) and (var_count === 1)):
            #variants_crop = img[crop_top:crop_bottom, crop_left:crop_right]
            #print(np.shape(variants_crop))
            #variants_crop_rgb = cv.cvtColor(variants_crop, cv.COLOR_BGR2RGB)
            #plt.imshow(variants_crop_rgb)
            #plt.show()
            
            var_count_str = '' if varfile_count == 1 else ('_' + str(varfile_count))
            #cv.imwrite(str(crops_path / Path(img_filename[:-4] + '_variants.png')),variants_crop)
            cv.imwrite(str(crops_path / Path(img_filename[:-6] + '_variants' + var_count_str + '.png')),img_canvas)
            
        
     
    for f in ss_files:
        f.replace(ss_path / 'bin' / f.name)
    
    print('Success')   
    
    return True
    

ss_path = Path('./thumbnails/cosmetics/pending_detection/')
crops_path = Path('./thumbnails/cosmetics/pending_approval/')
#ss_files = ss_path.glob('*.png')
ss_files = sorted(ss_path.glob('*.[jpJP][npNP][egEG]*'))    #from: https://stackoverflow.com/questions/48181073/how-to-glob-two-patterns-with-pathlib
try:
    main()
except Exception as e:
    for f in ss_files:
        f.replace(ss_path / 'bin' / f.name)
    print(e)
    raise e
        
sys.exit()