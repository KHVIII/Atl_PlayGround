# Pythono3 code to rename multiple  
# files in a directory or folder 
  
# importing os module 
import os 
  
# Function to rename multiple files 
def main(): 
    counter = 0
    for filename in os.listdir("newpub/360images"): 
        if filename.endswith(".jpg"):
            counter +=1
            dst ="img" + str(counter) + ".jpg"
            src ='newpub/360images/'+ filename 
            dst ='newpub/360images/'+ dst 
            
            # rename() function will 
            # rename all the files 
            os.rename(src, dst) 

  
# Driver Code 
if __name__ == '__main__': 
      
    # Calling main() function 
    main() 


#https://www.geeksforgeeks.org/rename-multiple-files-using-python/