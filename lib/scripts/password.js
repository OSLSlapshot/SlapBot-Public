import java.util.Random;

public class RandomString {
    public static void main(String[] args){
	
	String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
	String RandomString = "";
	int length = 5;
	
    Random rand = new Random();
	
	char[] text = new char[length];
	
	for(int i = 0; i < length; i++){
		text[i] = characters.charAt(rand.next(characters.length()));
	}
	
	for(i = 0; i < text.length, i++){
		RandomString += text[i];
	
	}
	
	System.out.println(RandomString);
}